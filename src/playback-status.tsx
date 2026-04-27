import { Color, Icon, LaunchType, MenuBarExtra, launchCommand, openExtensionPreferences, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { stopExternalPlayback } from "./utils/audio-player";
import { clearPlaybackState, readPlaybackState, type PlaybackState } from "./utils/playback-state";
import { getLastReadingSession, type ReadingSession } from "./utils/reading-session";

interface Snapshot {
  live: PlaybackState | null;
  session: ReadingSession | null;
  loading: boolean;
}

export default function PlaybackStatus() {
  const [snapshot, setSnapshot] = useState<Snapshot>({ live: null, session: null, loading: true });

  useEffect(() => {
    let mounted = true;

    async function load() {
      const [live, session] = await Promise.all([readPlaybackState(), getLastReadingSession()]);
      if (!mounted) return;
      setSnapshot({ live, session, loading: false });
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const { live, session, loading } = snapshot;
  const display = describeMenubar(live, session);

  // Hide the menubar entirely when there's nothing meaningful to show.
  if (!loading && !display) {
    return null;
  }

  return (
    <MenuBarExtra
      isLoading={loading}
      icon={display?.icon || Icon.SpeakerOn}
      title={display?.title}
      tooltip={display?.tooltip}
    >
      {live && (
        <MenuBarExtra.Section title="Now Reading">
          <MenuBarExtra.Item title={live.textPreview || "MiniMax TTS"} subtitle={describePhase(live)} />
          <MenuBarExtra.Item title={`Voice: ${live.voiceId}`} />
          <MenuBarExtra.Item title={`Source: ${live.source}`} subtitle={`${live.totalChars} chars`} />
        </MenuBarExtra.Section>
      )}

      {!live && session && session.nextChunkIndex < session.chunks.length && (
        <MenuBarExtra.Section title="Last Reading">
          <MenuBarExtra.Item
            title={truncate(session.text, 60) || "MiniMax TTS"}
            subtitle={`Paused at ${session.nextChunkIndex + 1}/${session.chunks.length}`}
          />
          <MenuBarExtra.Item title={`Voice: ${session.options.voiceId}`} />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section title="Controls">
        {(live?.phase === "synthesizing" || live?.phase === "playing") && (
          <MenuBarExtra.Item title="Stop" icon={Icon.Stop} onAction={handleStop} />
        )}
        {(session || live?.phase === "stopped") && (
          <MenuBarExtra.Item title="Resume Last Reading" icon={Icon.Play} onAction={handleResume} />
        )}
        {session && (
          <MenuBarExtra.Item title="Restart Last Reading" icon={Icon.RotateClockwise} onAction={handleRestart} />
        )}
        <MenuBarExtra.Item title="Read Selected Text…" icon={Icon.Microphone} onAction={handleQuickRead} />
        <MenuBarExtra.Item title="Pick Voice…" icon={Icon.Star} onAction={handleSelectVoice} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

interface MenuDisplay {
  title: string;
  icon: { source: Icon; tintColor?: Color } | Icon;
  tooltip: string;
}

function describeMenubar(live: PlaybackState | null, session: ReadingSession | null): MenuDisplay | null {
  if (live && (live.phase === "synthesizing" || live.phase === "playing")) {
    const verb = live.phase === "synthesizing" ? "Synth" : "Play";
    return {
      title: `${verb} ${live.chunkIndex + 1}/${live.chunkTotal}`,
      icon: { source: Icon.SpeakerOn, tintColor: live.phase === "synthesizing" ? Color.Orange : Color.Blue },
      tooltip: `MiniMax TTS · ${verb} chunk ${live.chunkIndex + 1}/${live.chunkTotal}`,
    };
  }

  if (live && live.phase === "stopped") {
    return {
      title: `Paused ${live.chunkIndex + 1}/${live.chunkTotal}`,
      icon: { source: Icon.Pause, tintColor: Color.SecondaryText },
      tooltip: "MiniMax TTS · paused. Click to resume.",
    };
  }

  if (session && session.nextChunkIndex > 0 && session.nextChunkIndex < session.chunks.length) {
    return {
      title: `Paused ${session.nextChunkIndex + 1}/${session.chunks.length}`,
      icon: { source: Icon.Pause, tintColor: Color.SecondaryText },
      tooltip: "MiniMax TTS · last reading paused. Click to resume.",
    };
  }

  return null;
}

function describePhase(state: PlaybackState): string {
  const total = state.chunkTotal;
  const idx = state.chunkIndex + 1;
  switch (state.phase) {
    case "synthesizing":
      return `Synthesizing ${idx}/${total}`;
    case "playing":
      return `Playing ${idx}/${total}`;
    case "stopped":
      return `Paused ${idx}/${total}`;
    case "completed":
      return `Completed ${total}/${total}`;
  }
}

function truncate(text: string, max: number): string {
  const chars = Array.from(text.replace(/\s+/g, " ").trim());
  if (chars.length <= max) return chars.join("");
  return chars.slice(0, max).join("") + "…";
}

async function handleStop() {
  const stopped = stopExternalPlayback();
  await clearPlaybackState();
  await showHUD(stopped ? "Playback stopped" : "No active playback");
}

async function handleResume() {
  await launchCommand({ name: "resume-reading", type: LaunchType.UserInitiated });
}

async function handleRestart() {
  await launchCommand({ name: "restart-reading", type: LaunchType.UserInitiated });
}

async function handleQuickRead() {
  await launchCommand({ name: "quick-read", type: LaunchType.UserInitiated });
}

async function handleSelectVoice() {
  await launchCommand({ name: "select-voice", type: LaunchType.UserInitiated });
}
