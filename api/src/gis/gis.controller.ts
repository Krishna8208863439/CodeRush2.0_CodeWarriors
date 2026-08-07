import { Request, Response, Router } from 'express';
import { query } from '../db';
import { authenticate, AuthenticatedRequest } from '../auth/auth.middleware';
import { Role } from '../auth/roles';

export const gisRouter = Router();

// 1. GET /gis/complaints (GeoJSON complaint pins with RBAC PII stripping)
gisRouter.get('/complaints', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { bbox, ward_id, category, status, from, to } = req.query;
    const isCitizen = req.user?.role === Role.CITIZEN;

    let queryText = `
      SELECT
        c.id,
        c.reference_id,
        c.category,
        c.status,
        c.created_at,
        gl.latitude,
        gl.longitude,
        gl.formatted_address,
        ST_AsGeoJSON(gl.geom)::json AS geometry
        ${!isCitizen ? ', c.officer_id, u.name as officer_name' : ''}
      FROM complaints c
      JOIN gis_locations gl ON gl.complaint_id = c.id
      LEFT JOIN users u ON u.id = c.officer_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (bbox) {
      const parts = (bbox as string).split(',').map(Number);
      if (parts.length === 4) {
        params.push(parts[0], parts[1], parts[2], parts[3]);
        queryText += ` AND ST_Within(gl.geom, ST_MakeEnvelope($${params.length - 3}, $${params.length - 2}, $${params.length - 1}, $${params.length}, 4326))`;
      }
    }

    if (ward_id) {
      params.push(ward_id);
      queryText += ` AND c.ward_id = $${params.length}`;
    }

    if (category) {
      params.push(category);
      queryText += ` AND c.category = $${params.length}`;
    }

    if (status) {
      params.push(status);
      queryText += ` AND c.status = $${params.length}`;
    }

    if (from) {
      params.push(from);
      queryText += ` AND c.created_at >= $${params.length}`;
    }

    if (to) {
      params.push(to);
      queryText += ` AND c.created_at <= $${params.length}`;
    }

    const dbRes = await query(queryText, params);

    const geoJson = {
      type: 'FeatureCollection',
      features: dbRes.rows.map((row) => ({
        type: 'Feature',
        geometry: row.geometry,
        properties: {
          id: row.id,
          referenceId: row.reference_id,
          category: row.category,
          status: row.status,
          createdAt: row.created_at,
          formattedAddress: row.formatted_address,
          ...(isCitizen ? {} : { officerId: row.officer_id, officerName: row.officer_name }),
        },
      })),
    };

    return res.json(geoJson);
  } catch (err: any) {
    return res.status(500).json({ error: 'GIS_QUERY_FAILED', message: err.message });
  }
});

// 2. GET /gis/wards (Ward Boundary GeoJSON)
gisRouter.get('/wards', authenticate, async (req: Request, res: Response) => {
  const dbRes = await query(
    `SELECT id, name, ward_number, ST_AsGeoJSON(boundary)::json AS geometry FROM wards`
  );

  const geoJson = {
    type: 'FeatureCollection',
    features: dbRes.rows.map((row) => ({
      type: 'Feature',
      geometry: row.geometry,
      properties: {
        id: row.id,
        name: row.name,
        wardNumber: row.ward_number,
      },
    })),
  };

  return res.json(geoJson);
});

// 3. GET /gis/heatmap (Density coordinates for Leaflet heatmap)
gisRouter.get('/heatmap', authenticate, async (req: Request, res: Response) => {
  const dbRes = await query(`SELECT latitude, longitude FROM gis_locations`);
  const points = dbRes.rows.map((row) => [row.latitude, row.longitude, 1.0]);
  return res.json({ points });
});
