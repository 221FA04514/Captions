import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('GET /api/health', () => {
  it('returns 200 with status ok and ffmpeg info', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.ffmpeg).toBeDefined();
    expect(typeof res.body.ffmpeg.version).toBe('string');
  });
});

describe('POST /api/projects', () => {
  it('creates a new project with a given title', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({ title: 'Test Project Alpha' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.title).toBe('Test Project Alpha');
    expect(res.body.captions).toEqual([]);
    expect(res.body.video).toBeNull();
  });

  it('creates a project with default title if none provided', async () => {
    const res = await request(app).post('/api/projects').send({});
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Untitled Project');
  });
});

describe('GET /api/projects/:id', () => {
  it('returns 404 for non-existent project', async () => {
    const res = await request(app).get('/api/projects/does-not-exist-abc123');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeTruthy();
  });

  it('returns the project after creation', async () => {
    const create = await request(app)
      .post('/api/projects')
      .send({ title: 'Fetch Test' });
    const id = create.body.id;

    const get = await request(app).get(`/api/projects/${id}`);
    expect(get.status).toBe(200);
    expect(get.body.title).toBe('Fetch Test');
  });
});

describe('PUT /api/projects/:id', () => {
  it('updates project captions and style', async () => {
    const create = await request(app)
      .post('/api/projects')
      .send({ title: 'Update Test' });
    const project = create.body;

    const updatedProject = {
      ...project,
      captions: [
        {
          id: 'test-cue-id',
          index: 1,
          startTime: 1.0,
          endTime: 3.0,
          text: 'నమస్కారం',
        },
      ],
    };

    const res = await request(app)
      .put(`/api/projects/${project.id}`)
      .send(updatedProject);

    expect(res.status).toBe(200);
    expect(res.body.captions).toHaveLength(1);
    expect(res.body.captions[0].text).toBe('నమస్కారం');
  });
});

describe('POST /api/upload/subtitles', () => {
  it('parses valid SRT content submitted as multipart text', async () => {
    const srtContent = `1\n00:00:01,000 --> 00:00:03,000\nHello World\n\n2\n00:00:04,000 --> 00:00:06,000\nSecond line\n\n`;

    const res = await request(app)
      .post('/api/upload/subtitles')
      .attach('subtitles', Buffer.from(srtContent, 'utf-8'), {
        filename: 'test.srt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(200);
    expect(res.body.isValid).toBe(true);
    expect(res.body.cueCount).toBe(2);
    expect(res.body.cues[0].text).toBe('Hello World');
  });

  it('parses VTT content with Telugu text', async () => {
    const vttContent = `WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nతెలుగు పరీక్ష\n\n`;

    const res = await request(app)
      .post('/api/upload/subtitles')
      .attach('subtitles', Buffer.from(vttContent, 'utf-8'), {
        filename: 'test.vtt',
        contentType: 'text/vtt',
      });

    expect(res.status).toBe(200);
    expect(res.body.cues[0].text).toBe('తెలుగు పరీక్ష');
  });

  it('returns 400 for empty subtitle file', async () => {
    const res = await request(app)
      .post('/api/upload/subtitles')
      .attach('subtitles', Buffer.from('', 'utf-8'), {
        filename: 'empty.srt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 400 for non-parseable content', async () => {
    const res = await request(app)
      .post('/api/upload/subtitles')
      .attach('subtitles', Buffer.from('This is not SRT or VTT content', 'utf-8'), {
        filename: 'garbage.srt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/media/:fileId', () => {
  it('returns 400 for path traversal attempt', async () => {
    const res = await request(app).get('/api/media/../../etc/passwd');
    expect([400, 403, 404]).toContain(res.status);
  });

  it('returns 400 for invalid file ID with special characters', async () => {
    const res = await request(app).get('/api/media/invalid*file!name');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/export', () => {
  it('returns 400 when projectId is missing', async () => {
    const res = await request(app).post('/api/export').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 404 for non-existent project', async () => {
    const res = await request(app)
      .post('/api/export')
      .send({ projectId: 'non-existent-project-id' });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/export/:jobId', () => {
  it('returns 404 for non-existent job', async () => {
    const res = await request(app).get('/api/export/fake-job-id');
    expect(res.status).toBe(404);
  });
});
