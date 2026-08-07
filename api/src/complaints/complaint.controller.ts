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
  title: z.string().optional(),
  description: z.string().min(5),
  channel: z.enum(['WEB', 'WHATSAPP', 'SMS', 'VOICE', 'IMAGE', 'VIDEO', 'AUDIO']).default('WEB'),
  language: z.enum(['EN', 'HI', 'MR', 'TA', 'TE', 'KN']).default('EN'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  formattedAddress: z.string().optional(),
  consentGranted: z.boolean().default(true),
});

// 1. POST /complaints (Web Form)
complaintRouter.post('/', authenticate, authorise([Role.CITIZEN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = createComplaintSchema.parse(req.body);
    const complaint = await ComplaintService.createComplaint({
      citizenId: req.user!.sub,
      channel: data.channel,
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
      complaint,
    });
  } catch (err: any) {
    if (err.message === 'CONSENT_REQUIRED') {
      return res.status(422).json({ error: 'CONSENT_REQUIRED', message: 'Explicit data processing consent is required' });
    }
    return res.status(400).json({ error: 'BAD_REQUEST', message: err.message });
  }
});

// 2. File Upload Intakes (Image, Audio, Voice, Video)
complaintRouter.post(
  '/image',
  authenticate,
  authorise([Role.CITIZEN]),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'NO_FILE_UPLOADED' });

      const description = req.body.description || 'Image complaint submission';
      const complaint = await ComplaintService.createComplaint({
        citizenId: req.user!.sub,
        channel: 'IMAGE',
        description,
        consentGranted: true,
      });

      const key = await ComplaintService.uploadAttachment(
        complaint.id,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'IMAGE'
      );

      return res.status(201).json({
        message: 'Image complaint uploaded successfully',
        referenceId: complaint.reference_id,
        fileKey: key,
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
      if (!req.file) return res.status(400).json({ error: 'NO_FILE_UPLOADED' });

      const complaint = await ComplaintService.createComplaint({
        citizenId: req.user!.sub,
        channel: 'AUDIO',
        description: req.body.description || 'Audio complaint upload',
        consentGranted: true,
      });

      const key = await ComplaintService.uploadAttachment(
        complaint.id,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'AUDIO'
      );

      return res.status(201).json({
        message: 'Audio complaint uploaded successfully',
        referenceId: complaint.reference_id,
        fileKey: key,
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
      if (!req.file) return res.status(400).json({ error: 'NO_FILE_UPLOADED' });

      const complaint = await ComplaintService.createComplaint({
        citizenId: req.user!.sub,
        channel: 'VOICE',
        description: 'Voice note complaint recording',
        consentGranted: true,
      });

      const key = await ComplaintService.uploadAttachment(
        complaint.id,
        req.file.buffer,
        req.file.originalname || 'voice.webm',
        req.file.mimetype,
        'AUDIO'
      );

      return res.status(201).json({
        message: 'Voice recording complaint uploaded successfully',
        referenceId: complaint.reference_id,
        fileKey: key,
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
      if (!req.file) return res.status(400).json({ error: 'NO_FILE_UPLOADED' });

      const complaint = await ComplaintService.createComplaint({
        citizenId: req.user!.sub,
        channel: 'VIDEO',
        description: req.body.description || 'Video complaint recording',
        consentGranted: true,
      });

      const key = await ComplaintService.uploadAttachment(
        complaint.id,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'VIDEO'
      );

      return res.status(201).json({
        message: 'Video complaint uploaded successfully',
        referenceId: complaint.reference_id,
        fileKey: key,
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
