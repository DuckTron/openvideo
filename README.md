<p align="center">
  <a href="https://github.com/openvideodev/openvideo">
    <img width="150px" height="150px" src="https://cdn.scenify.io/openvideo-logo.png"/>
  </a>
</p>
<h1 align="center">OpenVideo</h1>

<div align="center">
  
  
An AI-native video editing platform with browser-based 4K rendering, semantic search, and an intuitive API for building next-generation video applications.

<p align="center">
    <a href="https://openvideo.dev/">OpenVideo</a>
    ·  
    <a href="https://discord.gg/SCfMrQx8kr">Discord</a>
    ·  
    <a href="https://docs.openvideo.dev">Docs</a>
</p>
</div>

[![](https://cdn.scenify.io/openpreview1.png)](https://github.com/openvideodev/openvideo)

## Features

- **Browser-Based 4K Rendering**: Hardware-accelerated video processing entirely in the browser using WebCodecs and PixiJS. Export up to 4K resolution without server-side rendering.
- **Semantic Search**: AI-powered search across your video assets using vector embeddings and pgvector similarity search. Find clips by content, not just filenames.
- **Multi-Track Timeline**: Professional-grade timeline editor with support for multiple video, audio, and overlay tracks. Drag, drop, and arrange clips with precision.
- **Automatic Captions**: Generate and edit captions for your videos with AI-powered transcription. Support for multiple languages and custom styling.
- **AI-Native Architecture**: Built for AI integration from the ground up. Easy API for embedding AI features like semantic search, auto-editing, and intelligent asset organization.
- **Intuitive API**: Clean, type-safe API built with tRPC and TypeScript. Easy to extend and integrate into your own applications.
- **Transitions & Effects**: Smooth transitions between clips and a library of visual effects powered by GLSL shaders.
- **Real-Time Preview**: Instant playback feedback with hardware-accelerated rendering.
- **Cloud Storage**: Upload and manage assets in the cloud with Cloudflare R2 integration.
- **AI Director**: Intelligent assistant that helps organize and edit your video content automatically.
- **Project Organization**: Create spaces to organize multiple video projects and collaborate with team members.
- **Background Processing**: Efficient background indexing and processing using BullMQ and Trigger.dev for heavy tasks.
- **Real-Time Collaboration**: WebSocket-based real-time updates for collaborative editing sessions.

## Architecture

OpenVideo is built as a modern monorepo using pnpm and Turborepo:

- **Frontend**: Next.js 15 with App Router for the web interface
- **Backend**: NestJS Fastify API server handling REST endpoints, WebSocket gateway, and background workers
- **Database**: PostgreSQL with Drizzle ORM for unified data management
- **Communication**: tRPC for type-safe internal API calls
- **Authentication**: Better Auth with magic link and GitHub OAuth support
- **Rendering**: PixiJS-based compositor engine for video processing
- **AI**: Gemini API integration for semantic search and intelligent features

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL database
- Redis (for background queues)

### Installation

```bash
# Clone the repository
git clone https://github.com/openvideodev/openvideo.git
cd openvideo

# Install dependencies
pnpm install

# Set up environment variables
cp apps/app/.env.sample apps/app/.env.local
cp apps/director/.env.example apps/director/.env

# Run database migrations
pnpm --filter @openvideo/db db:push

# Start the development servers
pnpm dev
```

The application will be available at `http://localhost:3000`.

## Documentation

Comprehensive documentation is available at [docs.openvideo.dev](https://docs.openvideo.dev).

## Contributing

We welcome contributions! Please read our contributing guidelines before submitting pull requests.

## License

See [LICENSE](LICENSE).
