import axios from 'axios';
import { query } from '../db';
import { minioClient } from '../storage/minio.client';
import { config } from '../config';

export interface CreateComplaintDTO {
  citizenId: string;
  channel: 'WEB' | 'WHATSAPP' | 'SMS' | 'VOICE' | 'IMAGE' | 'VIDEO' | 'AUDIO';
  title?: string;
  description: string;
  language?: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  consentGranted: boolean;
  consentVersion?: string;
}

export class ComplaintService {
  // Generate CRP-YYYY-NNNNNN reference ID using PostgreSQL sequence
  static async generateReferenceId(): Promise<string> {
    const year = new Date().getFullYear();
    try {
      const seqRes = await query(`SELECT nextval('complaint_ref_seq') as seq`);
      const val = seqRes?.rows?.[0]?.seq ?? Math.floor(Math.random() * 899999 + 100000);
      const num = String(val).padStart(6, '0');
      return `CRP-${year}-${num}`;
    } catch {
      const fallbackNum = String(Math.floor(Math.random() * 899999 + 100000)).padStart(6, '0');
      return `CRP-${year}-${fallbackNum}`;
    }
  }

  // Phase 1: Complaint Intake
  static async createComplaint(dto: CreateComplaintDTO) {
    if (!dto.consentGranted) {
      throw new Error('CONSENT_REQUIRED');
    }

    // 1. Persist Consent Record
    await query(
      `INSERT INTO consent_records (citizen_id, consent_version, granted) VALUES ($1, $2, $3)`,
      [dto.citizenId, dto.consentVersion || 'v1.0', true]
    );

    // 2. Reference ID
    const refId = await this.generateReferenceId();
    const lang = dto.language || 'EN';

    // 3. Insert complaint row
    const complaintRes = await query(
      `INSERT INTO complaints (reference_id, citizen_id, title, description, channel, language, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'SUBMITTED')
       RETURNING id, reference_id, citizen_id, title, description, channel, language, status, created_at`,
      [refId, dto.citizenId, dto.title || 'Municipal Issue', dto.description, dto.channel, lang]
    );
    const complaint = complaintRes.rows[0];

    // 4. Reverse Geocoding for Ward Resolution via OpenStreetMap Nominatim
    let resolvedWard = 'unresolved';
    let formattedAddr = dto.formattedAddress || '';

    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      try {
        const geoRes = await axios.get('https://nominatim.openstreetmap.org/reverse', {
          params: {
            format: 'json',
            lat: dto.latitude,
            lon: dto.longitude,
            zoom: 18,
            addressdetails: 1,
          },
          headers: {
            'User-Agent': 'SwachhLensAI-CivicPortal/1.0 (contact: admin@communityredressal.gov.in)',
          },
          timeout: 3500,
        });

        if (geoRes.data) {
          const addr = geoRes.data.address || {};
          resolvedWard =
            addr.suburb ||
            addr.neighbourhood ||
            addr.residential ||
            addr.city_district ||
            addr.county ||
            addr.city ||
            'unresolved';

          if (!formattedAddr) {
            formattedAddr = geoRes.data.display_name || `Lat: ${dto.latitude}, Lon: ${dto.longitude}`;
          }
        }
      } catch (geoErr: any) {
        console.warn(`[Reverse Geocoding Failed for (${dto.latitude}, ${dto.longitude})]:`, geoErr.message);
        resolvedWard = 'unresolved';
        if (!formattedAddr) {
          formattedAddr = `Lat: ${dto.latitude}, Lon: ${dto.longitude}`;
        }
      }

      await query(
        `INSERT INTO gis_locations (complaint_id, geom, latitude, longitude, formatted_address)
         VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $3, $2, $4)`,
        [complaint.id, dto.longitude, dto.latitude, `[Ward: ${resolvedWard}] ${formattedAddr}`]
      );
    }

    // Attach GIS & Ward data to returned complaint
    const resultComplaint = {
      ...complaint,
      complaintNo: complaint.reference_id,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      ward: resolvedWard,
      formattedAddress: formattedAddr,
    };

    // 5. Asynchronous AI Translation & Classification Pipeline Trigger
    this.triggerAIPipeline(complaint.id, dto.description, lang).catch((err) => {
      console.error('Async AI Pipeline Execution Error:', err.message);
    });

    return resultComplaint;
  }

  // Phase 2: AI Pipeline Trigger
  static async triggerAIPipeline(complaintId: string, rawText: string, lang: string) {
    try {
      let textToAnalyse = rawText;

      // Translate if non-English
      if (lang !== 'EN') {
        const transRes = await axios.post(`${config.AI_SERVICE_URL}/ai/translate`, {
          text: rawText,
          source_lang: lang,
          target_lang: 'EN',
        });

        const translatedText = transRes.data.translated_text;

        await query(
          `INSERT INTO translation_logs (complaint_id, original_text, translated_text, source_lang, model_used)
           VALUES ($1, $2, $3, $4, $5)`,
          [complaintId, rawText, translatedText, lang, transRes.data.model_used || 'IndicTrans2']
        );

        textToAnalyse = translatedText;
      }

      // Call AI Service Analysis orchestrator
      const aiRes = await axios.post(`${config.AI_SERVICE_URL}/ai/analyse`, {
        complaint_id: complaintId,
        raw_text: textToAnalyse,
        language: 'EN',
      });

      const aiData = aiRes.data;

      if (!aiData.not_yet_available) {
        const isManual = aiData.confidence < 0.80;
        const status = isManual ? 'MANUAL_REVIEW' : 'ASSIGNED';

        // Get default department for category
        const deptRes = await query(`SELECT id FROM departments WHERE code = $1 LIMIT 1`, [aiData.category]);
        const deptId = deptRes.rows[0]?.id || null;

        // Persist AI prediction
        await query(
          `INSERT INTO ai_predictions (complaint_id, model_name, model_version, category, confidence, priority_score, reasoning, is_manual_review)
           VALUES ($1, 'distilbert-civic-v2', '2.1.0', $2, $3, $4, $5, $6)`,
          [complaintId, aiData.category, aiData.confidence, aiData.priority_score || 0.5, JSON.stringify(aiData.reasoning), isManual]
        );

        // Update complaint
        await query(
          `UPDATE complaints SET category = $1, department_id = $2, priority_score = $3, status = $4 WHERE id = $5`,
          [aiData.category, deptId, aiData.priority_score || 0.5, status, complaintId]
        );
      }
    } catch (err: any) {
      console.error(`AI Service pipeline call failed for complaint ${complaintId}:`, err.message);
    }
  }

  // Upload Attachment (Image, Audio, Video)
  static async uploadAttachment(
    complaintId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    type: 'IMAGE' | 'AUDIO' | 'VIDEO'
  ) {
    const key = `complaints/${complaintId}/${Date.now()}_${fileName}`;
    await minioClient.uploadFile(fileBuffer, key, mimeType);

    const tableName =
      type === 'IMAGE' ? 'complaint_images' : type === 'AUDIO' ? 'complaint_audio' : 'complaint_video';

    await query(
      `INSERT INTO ${tableName} (complaint_id, minio_key, mime_type, size_bytes) VALUES ($1, $2, $3, $4)`,
      [complaintId, key, mimeType, fileBuffer.length]
    );

    await query(
      `INSERT INTO evidence (complaint_id, evidence_type, minio_key, metadata) VALUES ($1, $2, $3, $4)`,
      [complaintId, type, key, JSON.stringify({ originalName: fileName, mimeType, size: fileBuffer.length })]
    );

    return key;
  }
}
