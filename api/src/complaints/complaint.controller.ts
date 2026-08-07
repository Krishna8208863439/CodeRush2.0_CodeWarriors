import { Request, Response, Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { ComplaintService } from './complaint.service';
import { authenticate, authorise, AuthenticatedRequest } from '../auth/auth.middleware';
import { Role } from '../auth/roles';
import { query } from '../db';
import { minioClient } from '../storage/minio.client';

export const complaintRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
});

const createComplaintSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(120, 'Title must be at most 120 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  channel: z
    .string()
    .transform((val) => val.toUpperCase())
    .default('TEXT'),
  language: z.enum(['EN', 'HI', 'MR', 'TA', 'TE', 'KN']).default('EN'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  formattedAddress: z.string().optional(),
  consentGranted: z.boolean().default(true),
});

// 1. POST /complaints (Web Form)
complaintRouter.post('/', authenticate, authorise([Role.CITIZEN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = createComplaintSchema.parse(req.body);
    const complaint = await ComplaintService.createComplaint({
      citizenId: req.user!.sub,
      channel: data.channel as any,
      title: data.title,
      description: data.description,
      language: data.language,
      latitude: data.latitude,
      longitude: data.longitude,
      formattedAddress: data.formattedAddress,
      consentGranted: data.consentGranted,
    });

    return res.status(201).json({
      message: 'Complaint submitted successfully',
      referenceId: complaint.reference_id,
      complaintNo: complaint.reference_id,
      complaint,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      const issueMsg = err.errors.map((e) => e.message).join('; ');
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: issueMsg });
    }
    if (err.message === 'CONSENT_REQUIRED') {
      return res.status(422).json({ error: 'CONSENT_REQUIRED', message: 'Explicit data processing consent is required' });
    }
    return res.status(400).json({ error: 'BAD_REQUEST', message: err.message });
  }
});

// File Signature (Magic Bytes) Inspection Helpers
function isJPEG(buf: Buffer): boolean {
  return buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
}

function isPNG(buf: Buffer): boolean {
  return buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
}

function isWEBP(buf: Buffer): boolean {
  return buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
}

function isValidImageSignature(buf: Buffer): boolean {
  if (isJPEG(buf) || isPNG(buf) || isWEBP(buf)) return true;
  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp') return true;
  return false;
}

function isValidAudioSignature(buf: Buffer): boolean {
  if (buf.length < 4) return false;
  const headHex = buf.toString('hex', 0, 4).toUpperCase();
  const asciiHead = buf.toString('ascii', 0, 4);

  if (asciiHead.startsWith('ID3')) return true;
  if (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0) return true;
  if (asciiHead === 'RIFF') return true;
  if (asciiHead === 'OggS') return true;
  if (headHex === '1A45DFA3') return true;
  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp') return true;
  return true;
}

function isValidVideoSignature(buf: Buffer): boolean {
  if (buf.length < 4) return false;
  const headHex = buf.toString('hex', 0, 4).toUpperCase();

  if (headHex === '1A45DFA3') return true;
  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp') return true;
  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'moov') return true;
  return true;
}

// Helper to parse numeric GIS coordinates from Multipart FormData
const parseCoords = (body: any) => {
  const lat = body.latitude ? parseFloat(body.latitude) : undefined;
  const lon = body.longitude ? parseFloat(body.longitude) : undefined;
  return {
    latitude: !isNaN(lat!) ? lat : undefined,
    longitude: !isNaN(lon!) ? lon : undefined,
  };
};

// 2. File Upload Intakes (Image, Audio, Voice, Video)
complaintRouter.post(
  '/image',
  authenticate,
  authorise([Role.CITIZEN]),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'NO_FILE_UPLOADED', message: 'No image file uploaded' });

      // Server-side size cap check (10MB)
      if (req.file.buffer.length > 10 * 1024 * 1024) {
        return res.status(400).json({
          error: 'FILE_TOO_LARGE',
          message: `Uploaded image size (${(req.file.buffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds 10MB limit.`,
        });
      }

      // Server-side magic bytes signature verification
      if (!isValidImageSignature(req.file.buffer)) {
        return res.status(400).json({
          error: 'INVALID_FILE_SIGNATURE',
          message: 'Server security check failed: File header binary signature does not match a valid image format (JPEG, PNG, WEBP, HEIC).',
        });
      }

      const { latitude, longitude } = parseCoords(req.body);
      const title = req.body.title || 'Photo Evidence Complaint';
      const description = req.body.description || 'Image complaint submission';
      const language = req.body.language || 'EN';

      const complaint = await ComplaintService.createComplaint({
        citizenId: req.user!.sub,
        channel: 'IMAGE',
        title,
        description,
        language,
        latitude,
        longitude,
        formattedAddress: req.body.formattedAddress,
        consentGranted: true,
      });

      const key = await ComplaintService.uploadAttachment(
        complaint.id,
        req.file.buffer,
        req.file.originalname || `image_${Date.now()}.jpg`,
        req.file.mimetype || 'image/jpeg',
        'IMAGE'
      );

      const mediaUrl = await minioClient.getPresignedUrl(key);

      return res.status(201).json({
        message: 'Image complaint uploaded successfully',
        referenceId: complaint.reference_id,
        complaintNo: complaint.reference_id,
        fileKey: key,
        mediaUrl,
        complaint: {
          ...complaint,
          mediaUrl,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'UPLOAD_FAILED', message: err.message });
    }
  }
);

complaintRouter.post(
  '/audio',
  authenticate,
  authorise([Role.CITIZEN]),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'NO_FILE_UPLOADED', message: 'No audio file uploaded' });

      // Server-side size cap check (20MB)
      if (req.file.buffer.length > 20 * 1024 * 1024) {
        return res.status(400).json({
          error: 'FILE_TOO_LARGE',
          message: `Uploaded audio file size (${(req.file.buffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds 20MB limit.`,
        });
      }

      // Server-side magic bytes signature verification
      if (!isValidAudioSignature(req.file.buffer)) {
        return res.status(400).json({
          error: 'INVALID_FILE_SIGNATURE',
          message: 'Server security check failed: File header signature does not match a valid audio format (MP3, WAV, M4A, OGG, WEBM).',
        });
      }

      const { latitude, longitude } = parseCoords(req.body);
      const title = req.body.title || 'Audio Recording Complaint';
      const description = req.body.description || 'Audio complaint file upload';
      const language = req.body.language || 'EN';

      const complaint = await ComplaintService.createComplaint({
        citizenId: req.user!.sub,
        channel: 'AUDIO',
        title,
        description,
        language,
        latitude,
        longitude,
        formattedAddress: req.body.formattedAddress,
        consentGranted: true,
      });

      const key = await ComplaintService.uploadAttachment(
        complaint.id,
        req.file.buffer,
        req.file.originalname || `audio_${Date.now()}.mp3`,
        req.file.mimetype || 'audio/mpeg',
        'AUDIO'
      );

      const mediaUrl = await minioClient.getPresignedUrl(key);

      return res.status(201).json({
        message: 'Audio complaint uploaded successfully',
        referenceId: complaint.reference_id,
        complaintNo: complaint.reference_id,
        fileKey: key,
        mediaUrl,
        complaint: {
          ...complaint,
          mediaUrl,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'UPLOAD_FAILED', message: err.message });
    }
  }
);

complaintRouter.post(
  '/voice',
  authenticate,
  authorise([Role.CITIZEN]),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'NO_FILE_UPLOADED', message: 'No voice recording uploaded' });

      // Server-side size cap check (20MB)
      if (req.file.buffer.length > 20 * 1024 * 1024) {
        return res.status(400).json({
          error: 'FILE_TOO_LARGE',
          message: `Voice recording size (${(req.file.buffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds 20MB limit.`,
        });
      }

      const { latitude, longitude } = parseCoords(req.body);
      const title = req.body.title || 'Voice Recording Complaint';
      const description = req.body.description || 'Voice recording complaint submission';
      const language = req.body.language || 'EN';

      const complaint = await ComplaintService.createComplaint({
        citizenId: req.user!.sub,
        channel: 'VOICE',
        title,
        description,
        language,
        latitude,
        longitude,
        formattedAddress: req.body.formattedAddress,
        consentGranted: true,
      });

      const key = await ComplaintService.uploadAttachment(
        complaint.id,
        req.file.buffer,
        req.file.originalname || `voice_${Date.now()}.webm`,
        req.file.mimetype || 'audio/webm',
        'AUDIO'
      );

      const mediaUrl = await minioClient.getPresignedUrl(key);

      return res.status(201).json({
        message: 'Voice recording complaint uploaded successfully',
        referenceId: complaint.reference_id,
        complaintNo: complaint.reference_id,
        fileKey: key,
        mediaUrl,
        complaint: {
          ...complaint,
          mediaUrl,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'UPLOAD_FAILED', message: err.message });
    }
  }
);

complaintRouter.post(
  '/video',
  authenticate,
  authorise([Role.CITIZEN]),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'NO_FILE_UPLOADED', message: 'No video file uploaded' });

      // Server-side size cap check (50MB)
      if (req.file.buffer.length > 50 * 1024 * 1024) {
        return res.status(400).json({
          error: 'FILE_TOO_LARGE',
          message: `Uploaded video size (${(req.file.buffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds 50MB limit.`,
        });
      }

      // Server-side magic bytes signature verification
      if (!isValidVideoSignature(req.file.buffer)) {
        return res.status(400).json({
          error: 'INVALID_FILE_SIGNATURE',
          message: 'Server security check failed: File header signature does not match a valid video format (MP4, WEBM, MOV).',
        });
      }

      const { latitude, longitude } = parseCoords(req.body);
      const title = req.body.title || 'Video Evidence Complaint';
      const description = req.body.description || 'Video complaint upload';
      const language = req.body.language || 'EN';

      const complaint = await ComplaintService.createComplaint({
        citizenId: req.user!.sub,
        channel: 'VIDEO',
        title,
        description,
        language,
        latitude,
        longitude,
        formattedAddress: req.body.formattedAddress,
        consentGranted: true,
      });

      const key = await ComplaintService.uploadAttachment(
        complaint.id,
        req.file.buffer,
        req.file.originalname || `video_${Date.now()}.mp4`,
        req.file.mimetype || 'video/mp4',
        'VIDEO'
      );

      const mediaUrl = await minioClient.getPresignedUrl(key);

      return res.status(201).json({
        message: 'Video complaint uploaded successfully',
        referenceId: complaint.reference_id,
        complaintNo: complaint.reference_id,
        fileKey: key,
        mediaUrl,
        complaint: {
          ...complaint,
          mediaUrl,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'UPLOAD_FAILED', message: err.message });
    }
  }
);

// 3. GET /complaints/mine (Citizen Dashboard Feed)
complaintRouter.get('/mine', authenticate, authorise([Role.CITIZEN]), async (req: AuthenticatedRequest, res: Response) => {
  const complaints = await query(
    `SELECT c.*, d.name as department_name
     FROM complaints c
     LEFT JOIN departments d ON d.id = c.department_id
     WHERE c.citizen_id = $1
     ORDER BY c.created_at DESC`,
    [req.user!.sub]
  );
  return res.json({ complaints: complaints.rows });
});

// 4. GET /complaints/:id (Detailed View with AI Reasoning & Presigned Media URLs)
complaintRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const complaintRes = await query(
    `SELECT c.*, d.name as department_name, u.name as officer_name
     FROM complaints c
     LEFT JOIN departments d ON d.id = c.department_id
     LEFT JOIN users u ON u.id = c.officer_id
     WHERE c.id = $1 OR c.reference_id = $1`,
    [id]
  );

  if (complaintRes.rows.length === 0) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Complaint not found' });
  }

  const complaint = complaintRes.rows[0];

  // Fetch AI Predictions with Reasoning JSONB
  const aiRes = await query(`SELECT * FROM ai_predictions WHERE complaint_id = $1 ORDER BY created_at DESC LIMIT 1`, [complaint.id]);
  const aiPrediction = aiRes.rows[0] || null;

  // Fetch Evidence Attachments with Presigned URLs
  const evidenceRes = await query(`SELECT * FROM evidence WHERE complaint_id = $1`, [complaint.id]);
  const evidence = await Promise.all(
    evidenceRes.rows.map(async (item) => {
      try {
        const url = await minioClient.getPresignedUrl(item.minio_key, 3600);
        return { ...item, presignedUrl: url };
      } catch {
        return { ...item, presignedUrl: null };
      }
    })
  );

  // Fetch Status History Timeline
  const historyRes = await query(
    `SELECT sh.*, u.name as officer_name FROM status_history sh
     LEFT JOIN users u ON u.id = sh.officer_id
     WHERE sh.complaint_id = $1 ORDER BY sh.created_at ASC`,
    [complaint.id]
  );

  return res.json({
    complaint,
    aiPrediction,
    evidence,
    statusHistory: historyRes.rows,
  });
});

// 5. POST /complaints/:id/appeal (Citizen Classification Appeal)
complaintRouter.post('/:id/appeal', authenticate, authorise([Role.CITIZEN]), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason || reason.trim().length === 0) {
    return res.status(400).json({ error: 'REASON_REQUIRED', message: 'Stated reason for appeal is required' });
  }

  const appealRes = await query(
    `INSERT INTO appeals (complaint_id, citizen_id, reason, status)
     VALUES ($1, $2, $3, 'PENDING') RETURNING *`,
    [id, req.user!.sub, reason]
  );

  return res.status(201).json({ message: 'Appeal submitted to System Administrator', appeal: appealRes.rows[0] });
});

// 6. POST /complaints/:id/feedback (Citizen Resolution Rating)
complaintRouter.post('/:id/feedback', authenticate, authorise([Role.CITIZEN]), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { rating, comments } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'INVALID_RATING', message: 'Rating must be between 1 and 5' });
  }

  const feedbackRes = await query(
    `INSERT INTO feedback (complaint_id, citizen_id, rating, comments)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [id, req.user!.sub, rating, comments || '']
  );

  return res.status(201).json({ message: 'Feedback submitted successfully', feedback: feedbackRes.rows[0] });
});

// 7. GET /complaints/open-data (Public Transparency API)
complaintRouter.get('/open-data', async (req: Request, res: Response) => {
  const dbRes = await query(
    `SELECT c.reference_id, c.category, c.status, c.created_at, c.updated_at,
            d.name as department_name, w.name as ward_name
     FROM complaints c
     LEFT JOIN departments d ON d.id = c.department_id
     LEFT JOIN wards w ON w.id = c.ward_id
     ORDER BY c.created_at DESC LIMIT 100`
  );
  return res.json({
    license: 'Open Government Data License (OGDL)',
    timestamp: new Date().toISOString(),
    recordCount: dbRes.rows.length,
    complaints: dbRes.rows,
  });
});

// 8. PATCH /complaints/:id/status (Officer status update — also reachable here so the
//    frontend PATCH /complaints/:id/status call lands correctly regardless of router mount)
complaintRouter.patch('/:id/status', authenticate, authorise([Role.OFFICER, Role.ADMIN, Role.DEPARTMENT_HEAD]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const validStatuses = ['IN_PROGRESS', 'RESOLVED', 'REJECTED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'INVALID_STATUS', message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    await query(`UPDATE complaints SET status = $1, updated_at = NOW() WHERE id = $2`, [status, id]);
    await query(
      `INSERT INTO status_history (complaint_id, officer_id, status, note) VALUES ($1, $2, $3, $4)`,
      [id, req.user!.sub, status, note || '']
    );

    return res.json({ message: `Complaint status updated to ${status}`, complaintId: id, status });
  } catch (err: any) {
    return res.status(500).json({ error: 'STATUS_UPDATE_FAILED', message: err.message });
  }
});

