import { showHUD } from "@raycast/api";
import { synthesizeSpeech } from "../api/minimax-tts";
import { AudioPlayer, hasExternalStopRequest } from "./audio-player";
import { formatTextSource } from "./text-source";
import { ReadingSession, updateReadingProgress } from "./reading-session";
import { buildTextPreview, clearPlaybackState, writePlaybackState } from "./playback-state";

export async function playReadingSession(session: ReadingSession, isResuming = false): Promise<void> {
  const player = new AudioPlayer();
  let activeSession = session;
  const chunkCount = session.chunks.length;
  const startIndex = Math.min(session.nextChunkIndex, chunkCount);
  const sourceLabel = formatTextSource(session.source);
  const textPreview = buildTextPreview(session.text);
  const previewSuffix = textPreview ? ` "${textPreview}"` : "";

  if (chunkCount === 0) {
    await showHUD("No text to read");
    return;
  }

  try {
    await showHUD(
      `${isResuming ? "Resuming" : "Reading"}${previewSuffix} · ${session.text.length} chars from ${sourceLabel} (${
        startIndex + 1
      }/${chunkCount})`,
    );

    for (let i = startIndex; i < chunkCount; i++) {
      if (player.isStopped() || hasExternalStopRequest()) break;

      await writePlaybackState({
        phase: "synthesizing",
        voiceId: activeSession.options.voiceId,
        source: activeSession.source,
        textPreview,
        totalChars: activeSession.text.length,
        chunkIndex: i,
        chunkTotal: chunkCount,
        updatedAt: new Date().toISOString(),
      });

      const audio = await synthesizeSpeech(activeSession.chunks[i], activeSession.options);
      if (player.isStopped() || hasExternalStopRequest()) break;

      await writePlaybackState({
        phase: "playing",
        voiceId: activeSession.options.voiceId,
        source: activeSession.source,
        textPreview,
        totalChars: activeSession.text.length,
        chunkIndex: i,
        chunkTotal: chunkCount,
        updatedAt: new Date().toISOString(),
      });

      await player.playAudio(audio);
      activeSession = await updateReadingProgress(activeSession, i + 1);

      if (hasExternalStopRequest()) {
        break;
      }
    }

    if (activeSession.nextChunkIndex >= chunkCount && !player.isStopped() && !hasExternalStopRequest()) {
      await showHUD("Playback complete");
      await clearPlaybackState();
    } else if (hasExternalStopRequest()) {
      const nextChunk = Math.min(activeSession.nextChunkIndex + 1, chunkCount);
      await showHUD(`Stopped${previewSuffix} · paused at ${nextChunk}/${chunkCount}`);
      await writePlaybackState({
        phase: "stopped",
        voiceId: activeSession.options.voiceId,
        source: activeSession.source,
        textPreview,
        totalChars: activeSession.text.length,
        chunkIndex: Math.min(activeSession.nextChunkIndex, chunkCount - 1),
        chunkTotal: chunkCount,
        updatedAt: new Date().toISOString(),
      });
    } else if (player.isStopped()) {
      await clearPlaybackState();
    }
  } finally {
    player.cleanup();
  }
}
