/**
 * Local AI Natural Language Command Parser
 * 
 * Clean abstraction:
 * User Natural Language -> Structured Editing Action -> Timeline Mutation -> FFmpeg Exporter
 */

export function parseNaturalLanguageCommand(prompt, context = {}) {
  const p = prompt.trim().toLowerCase();
  const activeClip = context.activeClip || {};
  const currentDuration = activeClip.duration || context.totalDuration || 12;
  const currentTrimStart = activeClip.trimStart || 0;
  const currentTrimEnd = activeClip.trimEnd || currentDuration;

  // 1. Remove first N seconds (e.g. "remove the first 5 seconds", "cut first 5s", "trim first 5 sec")
  const removeFirstMatch = p.match(/(?:remove|cut|delete|trim|drop)\s+(?:the\s+)?(?:first\s+)?(\d+(?:\.\d+)?)\s*(?:s|sec|seconds)?(?:\s+from\s+start)?/i) ||
                           p.match(/(?:first\s+)(\d+(?:\.\d+)?)\s*(?:s|sec|seconds)?\s*(?:remove|cut|delete|trim)/i);
  if (removeFirstMatch && (p.includes('first') || p.includes('start') || p.includes('begin'))) {
    const seconds = parseFloat(removeFirstMatch[1]);
    const newStart = Math.min(currentTrimEnd - 0.5, currentTrimStart + seconds);
    const newDuration = Math.max(0.5, (currentTrimEnd - newStart) / (activeClip.speed || 1));

    return {
      success: true,
      action: {
        type: 'TRIM_START',
        payload: { seconds },
        description: `Trim the first ${seconds}s from active video clip.`,
        plannedChanges: [
          { label: 'Start Timecode', from: `${currentTrimStart.toFixed(1)}s`, to: `${newStart.toFixed(1)}s` },
          { label: 'Clip Duration', from: `${((currentTrimEnd - currentTrimStart) / (activeClip.speed || 1)).toFixed(1)}s`, to: `${newDuration.toFixed(1)}s` }
        ]
      }
    };
  }

  // 2. Remove last N seconds (e.g. "remove the last 4 seconds", "cut last 3s")
  const removeLastMatch = p.match(/(?:remove|cut|delete|trim)\s+(?:the\s+)?(?:last\s+)?(\d+(?:\.\d+)?)\s*(?:s|sec|seconds)?/i);
  if (removeLastMatch && (p.includes('last') || p.includes('end'))) {
    const seconds = parseFloat(removeLastMatch[1]);
    const newEnd = Math.max(currentTrimStart + 0.5, currentTrimEnd - seconds);
    return {
      success: true,
      action: {
        type: 'TRIM_END',
        payload: { seconds },
        description: `Trim the last ${seconds}s from active video clip.`,
        plannedChanges: [
          { label: 'End Cut Point', from: `${currentTrimEnd.toFixed(1)}s`, to: `${newEnd.toFixed(1)}s` },
          { label: 'Clip Duration', from: `${((currentTrimEnd - currentTrimStart)).toFixed(1)}s`, to: `${(newEnd - currentTrimStart).toFixed(1)}s` }
        ]
      }
    };
  }

  // 3. Make this N seconds / Trim to N seconds (e.g. "make this 30 seconds", "make it 10 seconds", "trim to 30s")
  const trimToMatch = p.match(/(?:trim|set|make|cut)\s+(?:this\s+video|this|it)?\s*(?:to\s+)?(\d+(?:\.\d+)?)\s*(?:s|sec|seconds)?/i);
  if (trimToMatch && (p.includes('make') || p.includes('trim') || p.includes('set') || p.includes('duration'))) {
    const targetDuration = parseFloat(trimToMatch[1]);
    return {
      success: true,
      action: {
        type: 'SET_DURATION',
        payload: { duration: targetDuration },
        description: `Set clip duration to exactly ${targetDuration} seconds.`,
        plannedChanges: [
          { label: 'Target Duration', from: `${((currentTrimEnd - currentTrimStart)).toFixed(1)}s`, to: `${targetDuration.toFixed(1)}s` }
        ]
      }
    };
  }

  // 4. Increase / adjust speed (e.g. "increase speed to 1.25x", "speed up to 1.5x", "slow down to 0.5x")
  const speedMatch = p.match(/(?:speed|faster|slower|slow down|speed up|increase speed).*?(\d+(?:\.\d+)?)\s*x?/i);
  if (speedMatch) {
    const speed = parseFloat(speedMatch[1]);
    return {
      success: true,
      action: {
        type: 'SET_SPEED',
        payload: { speed },
        description: `Adjust playback speed to ${speed}x.`,
        plannedChanges: [
          { label: 'Playback Rate', from: `${activeClip.speed || 1.0}x`, to: `${speed}x` },
          { label: 'Timeline Duration', from: `${((currentTrimEnd - currentTrimStart) / (activeClip.speed || 1)).toFixed(1)}s`, to: `${((currentTrimEnd - currentTrimStart) / speed).toFixed(1)}s` }
        ]
      }
    };
  }

  // 5. Brightness (e.g. "make it brighter", "increase brightness", "more light")
  if (p.includes('brighter') || p.includes('increase brightness') || p.includes('more light') || p.includes('brighten')) {
    const currentB = activeClip.effects?.brightness || 0;
    const newB = Math.round((currentB + 0.15) * 100) / 100;
    return {
      success: true,
      action: {
        type: 'SET_EFFECT',
        payload: { effect: 'brightness', value: newB },
        description: `Increase brightness by +15%.`,
        plannedChanges: [
          { label: 'Brightness Exposure', from: `${currentB >= 0 ? '+' : ''}${currentB}`, to: `+${newB}` },
          { label: 'FFmpeg Filter', from: 'eq=brightness=0', to: `eq=brightness=${newB}` }
        ]
      }
    };
  }
  if (p.includes('darker') || p.includes('decrease brightness') || p.includes('less light')) {
    const currentB = activeClip.effects?.brightness || 0;
    const newB = Math.round((currentB - 0.15) * 100) / 100;
    return {
      success: true,
      action: {
        type: 'SET_EFFECT',
        payload: { effect: 'brightness', value: newB },
        description: `Decrease brightness by -15%.`,
        plannedChanges: [
          { label: 'Brightness Exposure', from: `${currentB}`, to: `${newB}` }
        ]
      }
    };
  }

  // 6. Contrast & Saturation
  if (p.includes('contrast') || p.includes('punchy')) {
    const curC = activeClip.effects?.contrast || 1.0;
    const newC = Math.round((curC + 0.2) * 100) / 100;
    return {
      success: true,
      action: {
        type: 'SET_EFFECT',
        payload: { effect: 'contrast', value: newC },
        description: `Boost video contrast to ${newC}.`,
        plannedChanges: [
          { label: 'Contrast', from: `${curC}`, to: `${newC}` }
        ]
      }
    };
  }
  if (p.includes('saturat') || p.includes('vibrant') || p.includes('color boost')) {
    const curS = activeClip.effects?.saturation || 1.0;
    const newS = Math.round((curS + 0.3) * 100) / 100;
    return {
      success: true,
      action: {
        type: 'SET_EFFECT',
        payload: { effect: 'saturation', value: newS },
        description: `Boost color saturation to ${newS}.`,
        plannedChanges: [
          { label: 'Saturation', from: `${curS}`, to: `${newS}` }
        ]
      }
    };
  }

  // 7. Remove original audio / Mute video (e.g. "remove original audio", "mute audio", "mute video")
  if (p.includes('remove original audio') || p.includes('mute original audio') || p.includes('mute audio') || p.includes('mute video') || p.includes('remove audio') || p.includes('silence audio')) {
    return {
      success: true,
      action: {
        type: 'MUTE_AUDIO',
        payload: { mute: true },
        description: 'Mute original video audio track.',
        plannedChanges: [
          { label: 'Audio Track', from: 'Active (100%)', to: 'Muted (0%)' },
          { label: 'Export Mode', from: 'Audio passthrough', to: 'Muted original audio' }
        ]
      }
    };
  }

  // 8. Add text overlay (e.g. 'Add text Epic Moment', 'Add title "Highlight"', 'add text "Summer"')
  const textMatch = prompt.match(/(?:add text|add title|overlay text|caption|add heading)\s+(?:["']([^"']+)["']|(.+))/i);
  if (textMatch) {
    const textContent = (textMatch[1] || textMatch[2] || 'Epic Moment').trim();
    return {
      success: true,
      action: {
        type: 'ADD_TEXT',
        payload: { text: textContent, position: 'bottom', fontSize: 40, color: '#ffffff' },
        description: `Add text overlay "${textContent}" to track T1.`,
        plannedChanges: [
          { label: 'Text Content', from: 'None', to: `"${textContent}"` },
          { label: 'Track', from: '-', to: 'T1 (Text Overlay)' },
          { label: 'Position', from: '-', to: 'Bottom Center' }
        ]
      }
    };
  }

  // 9. Add Captions / Subtitles
  if (p.includes('caption') || p.includes('subtitle')) {
    return {
      success: true,
      action: {
        type: 'ADD_TEXT',
        payload: { text: 'Subtitles / Caption', position: 'bottom', fontSize: 32, color: '#ffffff' },
        description: 'Add subtitle overlay on timeline track T1.',
        plannedChanges: [
          { label: 'Overlay Type', from: 'None', to: 'Bottom Subtitle' }
        ]
      }
    };
  }

  // 10. Add song / music / audio (e.g. "add this song", "add music", "add song")
  if (p.includes('add this song') || p.includes('add song') || p.includes('add music') || p.includes('add background music') || p.includes('add audio')) {
    return {
      success: true,
      action: {
        type: 'ADD_AUDIO_TRACK',
        payload: { volume: 0.8, fadeIn: 1.0 },
        description: 'Attach soundtrack from library to timeline audio track A1.',
        plannedChanges: [
          { label: 'Audio Track A1', from: 'Empty', to: 'Background Soundtrack' },
          { label: 'Volume', from: '-', to: '80% (with 1s fade-in)' }
        ]
      }
    };
  }

  // 11. Remove boring parts / silence detection (e.g. "remove the boring parts", "cut out silent parts")
  if (p.includes('boring') || p.includes('silent') || p.includes('silence') || p.includes('dead air') || p.includes('idle')) {
    return {
      success: true,
      action: {
        type: 'REMOVE_BORING_PARTS',
        payload: { thresholdDb: -30, leadTrim: 1.5, tailTrim: 1.0 },
        description: 'Smart Jump-Cut: Trim inactive intro/outro dead air to keep video energetic.',
        plannedChanges: [
          { label: 'Head Trim', from: '0.0s', to: '+1.5s (skip dead air)' },
          { label: 'Pacing', from: 'Uncut', to: 'Punchy jump-cut' }
        ]
      }
    };
  }

  // 12. Make clean short reel (e.g. "make a clean short reel from this video", "create reel", "make short")
  if (p.includes('reel') || p.includes('short') || p.includes('tiktok')) {
    return {
      success: true,
      action: {
        type: 'CREATE_REEL',
        payload: { targetDuration: 10, speed: 1.15, saturation: 1.3, title: 'Viral Reel' },
        description: 'Auto-format video into a clean 10s reel with 1.15x speed & vibrant grading.',
        plannedChanges: [
          { label: 'Target Format', from: 'Raw Footage', to: 'Social Reel (10s)' },
          { label: 'Speed Pacing', from: '1.0x', to: '1.15x' },
          { label: 'Color Look', from: 'Normal', to: 'Vibrant (+30% sat)' }
        ]
      }
    };
  }

  // 13. Black & White / Grayscale
  if (p.includes('grayscale') || p.includes('black and white') || p.includes('b&w')) {
    return {
      success: true,
      action: {
        type: 'SET_EFFECT',
        payload: { effect: 'grayscale', value: true },
        description: 'Apply Black & White Noir filter.',
        plannedChanges: [
          { label: 'Color Filter', from: 'Full Color', to: 'Grayscale (100%)' }
        ]
      }
    };
  }

  // 14. Sepia / Vintage
  if (p.includes('sepia') || p.includes('vintage') || p.includes('retro')) {
    return {
      success: true,
      action: {
        type: 'SET_EFFECT',
        payload: { effect: 'sepia', value: true },
        description: 'Apply Vintage Sepia tone look.',
        plannedChanges: [
          { label: 'Color Filter', from: 'Normal', to: 'Vintage Sepia' }
        ]
      }
    };
  }

  // 15. Split at playhead
  if (p.includes('split') || p.includes('cut here') || p.includes('cut at playhead')) {
    return {
      success: true,
      action: {
        type: 'SPLIT_AT_PLAYHEAD',
        payload: {},
        description: 'Split clip at current playhead timecode.',
        plannedChanges: [
          { label: 'Split Point', from: '-', to: `${(context.currentTime || 0).toFixed(1)}s` },
          { label: 'Timeline Clips', from: '1 Clip', to: '2 Clips' }
        ]
      }
    };
  }

  // 17. Vignette Focus
  if (p.includes('vignette') || p.includes('dark edges') || p.includes('lens falloff')) {
    return {
      success: true,
      action: {
        type: 'SET_EFFECT',
        payload: { effect: 'vignette', value: true },
        description: 'Apply cinematic lens vignette with darkened perimeter.',
        plannedChanges: [
          { label: 'Lens Vignette', from: 'Off', to: 'Cinematic Radial Falloff' }
        ]
      }
    };
  }

  // 18. Warm Golden Hour
  if (p.includes('warm') || p.includes('golden hour') || p.includes('sunset')) {
    return {
      success: true,
      action: {
        type: 'SET_EFFECT',
        payload: { effect: 'warm', value: true },
        description: 'Apply warm golden hour color balance with amber glow.',
        plannedChanges: [
          { label: 'Color Temperature', from: 'Neutral', to: 'Golden Hour Warm' }
        ]
      }
    };
  }

  // 19. Cool Cyberpunk / Neon
  if (p.includes('cyberpunk') || p.includes('neon') || p.includes('teal') || p.includes('cool look')) {
    return {
      success: true,
      action: {
        type: 'SET_EFFECT',
        payload: { effect: 'cool', value: true },
        description: 'Apply high-contrast cyberpunk neon teal & blue styling.',
        plannedChanges: [
          { label: 'Color Grade', from: 'Standard', to: 'Cyberpunk Neon Teal' }
        ]
      }
    };
  }

  // 20. Invert / Negative / Thermal
  if (p.includes('invert') || p.includes('negative') || p.includes('thermal') || p.includes('x-ray')) {
    return {
      success: true,
      action: {
        type: 'SET_EFFECT',
        payload: { effect: 'invert', value: true },
        description: 'Invert colors for a stylized negative/thermal effect.',
        plannedChanges: [
          { label: 'Color Mode', from: 'Normal', to: 'Inverted Negative' }
        ]
      }
    };
  }

  // 21. Film Grain / Noise
  if (p.includes('grain') || p.includes('film grain') || p.includes('noise') || p.includes('analog')) {
    return {
      success: true,
      action: {
        type: 'SET_EFFECT',
        payload: { effect: 'filmGrain', value: true },
        description: 'Apply 35mm cinema film grain texture.',
        plannedChanges: [
          { label: 'Texture', from: 'Clean Digital', to: '35mm Film Grain' }
        ]
      }
    };
  }

  // 22. Fade In & Fade Out Transitions
  if (p.includes('fade in and fade out') || p.includes('fade in out') || p.includes('fades')) {
    return {
      success: true,
      action: {
        type: 'SET_EFFECT',
        payload: { effect: 'fadeBoth', value: true },
        description: 'Add 1s visual & audio fade in at start and fade out at end.',
        plannedChanges: [
          { label: 'Intro Fade', from: 'Cut', to: '1.0s Fade from Black' },
          { label: 'Outro Fade', from: 'Cut', to: '1.0s Fade to Black' }
        ]
      }
    };
  }
  if (p.includes('fade in')) {
    return {
      success: true,
      action: {
        type: 'SET_EFFECT',
        payload: { effect: 'fadeIn', value: true },
        description: 'Add 1.0s smooth fade-in from black at clip start.',
        plannedChanges: [
          { label: 'Intro Transition', from: 'Direct Cut', to: '1.0s Fade In' }
        ]
      }
    };
  }
  if (p.includes('fade out')) {
    return {
      success: true,
      action: {
        type: 'SET_EFFECT',
        payload: { effect: 'fadeOut', value: true },
        description: 'Add 1.0s smooth fade-out to black at clip end.',
        plannedChanges: [
          { label: 'Outro Transition', from: 'Direct Cut', to: '1.0s Fade Out' }
        ]
      }
    };
  }

  // 23. Ken Burns Motion / Slow Zoom Animation
  if (p.includes('ken burns') || p.includes('slow zoom') || p.includes('zoom in animation') || p.includes('pan and zoom')) {
    return {
      success: true,
      action: {
        type: 'SET_EFFECT',
        payload: { effect: 'animation', value: 'kenBurns' },
        description: 'Apply cinematic Ken Burns slow-zoom animation across clip.',
        plannedChanges: [
          { label: 'Motion', from: 'Static', to: 'Ken Burns Zoom (1.0x -> 1.25x)' }
        ]
      }
    };
  }

  // 24. Duplicate Clip
  if (p.includes('duplicate') || p.includes('clone clip') || p.includes('copy clip')) {
    return {
      success: true,
      action: {
        type: 'DUPLICATE_CLIP',
        payload: {},
        description: 'Duplicate active clip and append it on the timeline.',
        plannedChanges: [
          { label: 'Timeline Action', from: 'Single Clip', to: 'Duplicated Copy' }
        ]
      }
    };
  }

  // 25. Add Sound Effect (SFX)
  if (p.includes('whoosh') || p.includes('swoop')) {
    return {
      success: true,
      action: {
        type: 'ADD_SFX',
        payload: { sfxId: 'sfx_whoosh', name: 'Whoosh Swoop', file: 'whoosh_transition.mp3' },
        description: 'Add Whoosh transition sound effect to audio track.',
        plannedChanges: [
          { label: 'SFX Track', from: '-', to: 'Whoosh Swoop (0.5s)' }
        ]
      }
    };
  }
  if (p.includes('boom') || p.includes('cinematic hit') || p.includes('impact sound')) {
    return {
      success: true,
      action: {
        type: 'ADD_SFX',
        payload: { sfxId: 'sfx_boom', name: 'Cinematic Hit', file: 'cinematic_boom.mp3' },
        description: 'Add Cinematic Boom bass drop impact to audio track.',
        plannedChanges: [
          { label: 'SFX Track', from: '-', to: 'Cinematic Boom (1.4s)' }
        ]
      }
    };
  }
  if (p.includes('camera') || p.includes('shutter') || p.includes('click')) {
    return {
      success: true,
      action: {
        type: 'ADD_SFX',
        payload: { sfxId: 'sfx_camera', name: 'Camera Shutter', file: 'camera_click.mp3' },
        description: 'Add Camera Shutter snapshot sound effect to audio track.',
        plannedChanges: [
          { label: 'SFX Track', from: '-', to: 'Camera Click (0.18s)' }
        ]
      }
    };
  }
  if (p.includes('bell') || p.includes('ding') || p.includes('chime')) {
    return {
      success: true,
      action: {
        type: 'ADD_SFX',
        payload: { sfxId: 'sfx_bell', name: 'Bell Chime', file: 'bell_notification.mp3' },
        description: 'Add Bell Chime notification sound to audio track.',
        plannedChanges: [
          { label: 'SFX Track', from: '-', to: 'Bell Chime (0.8s)' }
        ]
      }
    };
  }

  // 16. Reset effects
  if (p.includes('reset') || p.includes('clear effect') || p.includes('normal')) {
    return {
      success: true,
      action: {
        type: 'CLEAR_EFFECTS',
        payload: {},
        description: 'Reset all visual & color effects to default.',
        plannedChanges: [
          { label: 'Effects', from: 'Modified', to: 'Default (0)' }
        ]
      }
    };
  }

  return {
    success: false,
    error: `Command "${prompt}" not recognized. Try one of the suggested actions below.`,
    suggestions: [
      'Remove the first 5 seconds',
      'Add cinematic vignette and warm look',
      'Apply Ken Burns slow zoom animation',
      'Fade in and fade out this clip',
      'Make it cyberpunk neon teal',
      'Add Whoosh sound effect',
      'Duplicate this clip',
      'Make a clean short reel from this video'
    ]
  };
}
