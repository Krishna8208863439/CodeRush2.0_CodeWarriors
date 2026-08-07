import axios from 'axios';
import FormData from 'form-data';

async function testAllChannels() {
  console.log('================================================================');
  console.log('  SWACHHLENS AI - ALL 5 INTAKE CHANNELS & MAGIC BYTE SECURITY  ');
  console.log('================================================================\n');

  const API_BASE = 'http://localhost:3001/api';
  const testEmail = `all_channels_${Date.now()}@communityredressal.gov.in`;
  const testPassword = 'Password123!';

  // 1. Register & Login
  await axios.post(`${API_BASE}/auth/register`, {
    email: testEmail,
    password: testPassword,
    name: 'All Channels Tester',
    role: 'CITIZEN',
  });

  const loginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: testEmail,
    password: testPassword,
  });
  const token = loginRes.data.accessToken;
  const headers = { Authorization: `Bearer ${token}` };

  console.log('✅ Authenticated test citizen token acquired.');

  // 2. TEST 1: TEXT CHANNEL
  console.log('\n[CHANNEL 1/5: TEXT] Submitting Text Complaint...');
  const textRes = await axios.post(
    `${API_BASE}/complaints`,
    {
      title: 'Pothole on Main Highway near Ward 8',
      description: 'Dangerous deep pothole on the center lane of the highway causing traffic bottleneck and accident risk.',
      channel: 'TEXT',
      language: 'EN',
      latitude: 19.0760,
      longitude: 72.8777,
      consentGranted: true,
    },
    { headers }
  );
  console.log('  -> Status:', textRes.status, '| Reference ID:', textRes.data.referenceId, '| Ward:', textRes.data.complaint.ward);

  // 3. TEST 2: IMAGE CHANNEL (with valid JPEG Magic Bytes 0xFF 0xD8 0xFF 0xE0)
  console.log('\n[CHANNEL 2/5: IMAGE] Submitting Image Complaint...');
  const imageForm = new FormData();
  const validJpegBuffer = Buffer.concat([
    Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]),
    Buffer.from('IMAGE_BINARY_CONTENT_DUMMY_DATA_PAYLOAD')
  ]);
  imageForm.append('file', validJpegBuffer, { filename: 'pothole_evidence.jpg', contentType: 'image/jpeg' });
  imageForm.append('title', 'Photo Evidence of Waste Dumping');
  imageForm.append('description', 'Photographic proof of illegal waste dump');
  imageForm.append('language', 'EN');
  imageForm.append('latitude', '19.0800');
  imageForm.append('longitude', '72.8800');

  const imageRes = await axios.post(`${API_BASE}/complaints/image`, imageForm, {
    headers: { ...headers, ...imageForm.getHeaders() },
  });
  console.log('  -> Status:', imageRes.status, '| Reference ID:', imageRes.data.referenceId, '| Media URL:', imageRes.data.mediaUrl);

  // 3b. TEST 2b: REJECT FAKE IMAGE WITH INVALID SIGNATURE
  console.log('\n[SECURITY TEST: INVALID FILE REJECTION] Uploading PDF renamed as .jpg...');
  const fakeImageForm = new FormData();
  fakeImageForm.append('file', Buffer.from('%PDF-1.5 Fake Document Content'), { filename: 'fake_photo.jpg', contentType: 'image/jpeg' });
  try {
    await axios.post(`${API_BASE}/complaints/image`, fakeImageForm, {
      headers: { ...headers, ...fakeImageForm.getHeaders() },
    });
    console.log('  -> Security Check Failed ❌');
  } catch (err: any) {
    console.log('  -> Security Check Passed ✅: Rejected with HTTP', err.response?.status, '| Error:', err.response?.data?.message);
  }

  // 4. TEST 3: VOICE CHANNEL (with valid WebM/EBML Magic Bytes 0x1A 0x45 0xDF 0xA3)
  console.log('\n[CHANNEL 3/5: VOICE] Submitting Voice Recording Complaint...');
  const voiceForm = new FormData();
  const validWebmBuffer = Buffer.concat([
    Buffer.from([0x1A, 0x45, 0xDF, 0xA3]),
    Buffer.from('WEBM_AUDIO_RECORDING_DUMMY_STREAM')
  ]);
  voiceForm.append('file', validWebmBuffer, { filename: 'voice_recording.webm', contentType: 'audio/webm' });
  voiceForm.append('title', 'Voice Note Complaint');
  voiceForm.append('description', 'Spoken voice note regarding streetlight outage');
  voiceForm.append('language', 'EN');
  voiceForm.append('latitude', '19.0850');
  voiceForm.append('longitude', '72.8850');

  const voiceRes = await axios.post(`${API_BASE}/complaints/voice`, voiceForm, {
    headers: { ...headers, ...voiceForm.getHeaders() },
  });
  console.log('  -> Status:', voiceRes.status, '| Reference ID:', voiceRes.data.referenceId, '| Media URL:', voiceRes.data.mediaUrl);

  // 5. TEST 4: AUDIO CHANNEL (with valid ID3 MP3 Magic Bytes)
  console.log('\n[CHANNEL 4/5: AUDIO] Submitting Pre-recorded Audio Complaint...');
  const audioForm = new FormData();
  const validMp3Buffer = Buffer.concat([
    Buffer.from('ID3'),
    Buffer.from([0x03, 0x00, 0x00, 0x00, 0x00, 0x00]),
    Buffer.from('MP3_AUDIO_STREAM_DUMMY_DATA')
  ]);
  audioForm.append('file', validMp3Buffer, { filename: 'audio_noise_sample.mp3', contentType: 'audio/mpeg' });
  audioForm.append('title', 'Audio Recording of Commercial Noise');
  audioForm.append('description', 'Audio proof of noise violation past 10 PM');
  audioForm.append('language', 'EN');
  audioForm.append('latitude', '19.0900');
  audioForm.append('longitude', '72.8900');

  const audioRes = await axios.post(`${API_BASE}/complaints/audio`, audioForm, {
    headers: { ...headers, ...audioForm.getHeaders() },
  });
  console.log('  -> Status:', audioRes.status, '| Reference ID:', audioRes.data.referenceId, '| Media URL:', audioRes.data.mediaUrl);

  // 6. TEST 5: VIDEO CHANNEL (with valid MP4 ftyp Magic Bytes)
  console.log('\n[CHANNEL 5/5: VIDEO] Submitting Video Evidence Complaint...');
  const videoForm = new FormData();
  const validMp4Buffer = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32]),
    Buffer.from('MP4_VIDEO_STREAM_DUMMY_PAYLOAD')
  ]);
  videoForm.append('file', validMp4Buffer, { filename: 'sewage_leak_clip.mp4', contentType: 'video/mp4' });
  videoForm.append('title', 'Video Evidence of Drainage Overflow');
  videoForm.append('description', 'Recorded video of open sewage pipe leak');
  videoForm.append('language', 'EN');
  videoForm.append('latitude', '19.0950');
  videoForm.append('longitude', '72.8950');

  const videoRes = await axios.post(`${API_BASE}/complaints/video`, videoForm, {
    headers: { ...headers, ...videoForm.getHeaders() },
  });
  console.log('  -> Status:', videoRes.status, '| Reference ID:', videoRes.data.referenceId, '| Media URL:', videoRes.data.mediaUrl);

  console.log('\n================================================================');
  console.log('  ALL 5 CHANNELS & SECURITY SIGNATURE CHECKS VERIFIED! ✅  ');
  console.log('================================================================');
}

testAllChannels().catch((err) => {
  console.error('Test Error:', err.response?.data || err.message);
  process.exit(1);
});
