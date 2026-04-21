# MiniMax TTS - Raycast Extension

Read selected macOS text aloud from Raycast using MiniMax Speech 2.8.

## Why This Uses the HTTP API

MiniMax Token Plan users can synthesize speech through the official `mmx-cli`, but this extension calls the MiniMax T2A HTTP API directly:

- No global `mmx` dependency for Raycast users.
- Credentials stay in Raycast extension preferences.
- The extension can be published, copied, or run on another Mac without reproducing a CLI login.
- Runtime errors map directly to MiniMax API responses.

The CLI is still useful for local setup and smoke tests:

```bash
mmx auth status
mmx speech synthesize --text "测试。" --voice "Chinese (Mandarin)_News_Anchor" --out test.mp3
mmx speech voices --language chinese --output json
```

## Features

- Quick Read Selected Text: read selected text with the default voice.
- Read with Voice Selection: fetch available MiniMax system, cloned, and generated voices.
- Stop Reading: stop the active `afplay` process.
- Smart chunking: splits long selections into non-streaming chunks below 3,000 characters.
- Region support: China endpoint (`api.minimaxi.com`) and Global endpoint (`api.minimax.io`).

## Configuration

Open the extension preferences in Raycast and set:

| Setting | Description |
| --- | --- |
| API Key | MiniMax Token Plan or API key |
| Region | China or Global API endpoint |
| Model | Default is `speech-2.8-hd` |
| Default Voice | Built-in quick-read voice |
| Custom Default Voice ID | Optional cloned/generated voice ID |
| Language Boost | `auto`, Chinese, English, etc. |
| Speech Rate | 0.5x to 2.0x |

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Technical Notes

- API: MiniMax T2A HTTP `POST /v1/t2a_v2`
- Voice lookup: MiniMax Voice Management `POST /v1/get_voice`
- Audio response: hex-encoded MP3 converted to base64, then played through macOS `afplay`
- Playback stop: PID file in `$TMPDIR/minimax-tts.pid`

## References

- [MiniMax T2A HTTP API](https://platform.minimax.io/docs/api-reference/speech-t2a-http)
- [MiniMax CLI](https://github.com/MiniMax-AI/cli)
- [MiniMax Token Plan](https://platform.minimax.io/docs/guides/pricing-tokenplan)
- [Raycast Extension Docs](https://developers.raycast.com/)
