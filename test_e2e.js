async function testApi() {
  console.log('--- 1. Testing Status Endpoint ---');
  const statusRes = await fetch('http://localhost:5001/api/status');
  const status = await statusRes.json();
  console.log('Status: Available =', status.ffmpeg.available, 'Version =', status.ffmpeg.version);

  console.log('\n--- 2. Testing Media Endpoint ---');
  const mediaRes = await fetch('http://localhost:5001/api/media');
  const media = await mediaRes.json();
  console.log('Found media items:', media.length);
  media.forEach(m => console.log(` - Media: ${m.originalName} (${m.type}, ${m.metadata.width ? m.metadata.width + 'x' + m.metadata.height : ''} ${m.metadata.duration}s)`));

  console.log('\n--- 3. Testing AI Command Parser ---');
  const prompts = [
    'Remove the first 5 seconds',
    'Trim this video to 30 seconds',
    'Make it brighter',
    'Increase speed to 1.25x',
    'Remove original audio',
    'Add text "Epic Moment"',
    'Cut out the silent parts'
  ];
  for (const p of prompts) {
    const aiRes = await fetch('http://localhost:5001/api/ai/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: p })
    });
    const parsed = await aiRes.json();
    console.log(`Prompt: "${p}" -> Action: ${parsed.action?.type} (${parsed.action?.description})`);
  }

  console.log('\n--- 4. Testing End-to-End FFmpeg Export ---');
  const sampleVideo = media.find(m => m.type === 'video');
  if (sampleVideo) {
    const projectData = {
      videoClips: [{
        id: 'clip_test',
        filePath: sampleVideo.filePath,
        duration: sampleVideo.metadata.duration,
        trimStart: 2,
        trimEnd: 8,
        timelineStart: 0,
        speed: 1.0,
        effects: {
          brightness: 0.1,
          contrast: 1.1,
          saturation: 1.2
        }
      }],
      audioClips: [],
      textOverlays: [{
        id: 'txt_test',
        text: 'FFMPEG AI EXPORT TEST',
        startTime: 0,
        endTime: 6,
        fontSize: 36,
        color: 'white',
        position: 'bottom'
      }]
    };

    const expRes = await fetch('http://localhost:5001/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectData, preset: 'original', customFilename: 'e2e_test_render.mp4' })
    });
    const expData = await expRes.json();
    console.log('Export started, Job ID:', expData.jobId);

    // Poll until complete
    let done = false;
    for (let i = 0; i < 20 && !done; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const pollRes = await fetch('http://localhost:5001/api/export/status/' + expData.jobId);
      const pollData = await pollRes.json();
      console.log(`Job progress: ${pollData.progress}% (Status: ${pollData.status})`);
      if (pollData.status === 'completed') {
        done = true;
        console.log('SUCCESS! Rendered file:', pollData.result?.outputPath, 'Size:', pollData.result?.fileSize, 'bytes');
      } else if (pollData.status === 'error') {
        console.error('Job error:', pollData.error);
        break;
      }
    }
  }
}
testApi();
