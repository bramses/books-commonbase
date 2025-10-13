# Commonbase Desktop - Distribution

## Download & Installation

### Prerequisites

Before installing Commonbase Desktop, you'll need:

1. **PostgreSQL with pgvector extension** - The app requires a PostgreSQL database with the pgvector extension for semantic search
2. **OpenAI API Key** - For AI-powered image descriptions and text embeddings

### Quick Start

1. **Set up PostgreSQL + pgvector:**
   ```bash
   # Install PostgreSQL (macOS)
   brew install postgresql

   # Install pgvector extension
   brew install pgvector

   # Start PostgreSQL
   brew services start postgresql

   # Create database
   createdb commonbase-electron

   # Enable pgvector extension
   psql commonbase-electron -c "CREATE EXTENSION IF NOT EXISTS vector;"
   ```

2. **Download and Install Commonbase Desktop:**
   - **macOS**: Download `Commonbase-Desktop-1.0.0.dmg` and drag to Applications
   - **Windows**: Download `Commonbase-Desktop-1.0.0.exe` and run installer
   - **Linux**: Download `.deb` or `.rpm` package and install

3. **Configure Settings:**
   - Launch Commonbase Desktop
   - Go to Settings (gear icon in sidebar)
   - Enter your OpenAI API Key
   - Configure your PostgreSQL database URL (default: `postgresql://localhost:5432/commonbase-electron`)
   - Adjust search thresholds as needed

## Building from Source

### Development Setup

```bash
# Clone the repository
git clone https://github.com/bramses/commonbase-electron.git
cd commonbase-electron

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and OpenAI API key

# Push database schema
npm run db:push

# Start development server
npm start
```

### Building Distributables

```bash
# Build for current platform
npm run make

# Package without installer (faster for testing)
npm run package
```

The built distributables will be in the `out/` directory:
- **macOS**: `out/make/Commonbase-Desktop-1.0.0.dmg`
- **Windows**: `out/make/squirrel.windows/x64/Commonbase Desktop-1.0.0 Setup.exe`
- **Linux**: `out/make/deb/x64/commonbase-desktop_1.0.0_amd64.deb`

### Cross-Platform Building

To build for other platforms, you'll need the appropriate toolchain:

```bash
# Build for macOS (requires macOS)
npm run make -- --platform=darwin

# Build for Windows (requires wine on non-Windows)
npm run make -- --platform=win32

# Build for Linux
npm run make -- --platform=linux
```

## Configuration

### Database Configuration

The app supports PostgreSQL databases with the pgvector extension. You can configure:

- **Database URL**: Full PostgreSQL connection string
- **Connection pooling**: Handled automatically
- **Schema management**: Use `npm run db:push` to sync schema

### AI Configuration

- **OpenAI API Key**: Required for image descriptions and embeddings
- **Embedding Model**: Uses `text-embedding-3-small` (1536 dimensions)
- **Vision Model**: Uses `gpt-4o-mini` for image descriptions

### Search Settings

- **Similarity Threshold**: Minimum similarity score for search results (0.1-1.0)
- **Search Limit**: Maximum number of results to return
- **Categories**: Files are automatically categorized (code, config, web, data, document, script)

## Features

- **File Processing**: Supports text, PDF, DOCX, CSV, images, and more
- **AI Image Description**: Automatic image analysis with OpenAI Vision
- **Semantic Search**: Vector-based similarity search using embeddings
- **Syntax Highlighting**: Code files rendered with proper syntax highlighting
- **Drag & Drop**: Easy file uploading with progress indicators
- **Cross-Platform**: Works on macOS, Windows, and Linux

## Troubleshooting

### Database Issues
- Ensure PostgreSQL is running: `brew services start postgresql`
- Verify pgvector extension: `psql -c "SELECT * FROM pg_extension WHERE extname='vector';"`
- Check connection: `psql "postgresql://localhost:5432/commonbase-electron"`

### API Issues
- Verify OpenAI API key in Settings
- Check network connectivity
- Review console logs for detailed error messages

### Performance
- For large databases, consider adjusting search limits
- Use appropriate similarity thresholds (0.7+ for more relevant results)
- Monitor database disk usage

## Support

For issues, questions, or feature requests:
- GitHub Issues: https://github.com/bramses/commonbase-electron/issues
- Email: 3282661+bramses@users.noreply.github.com

## License

MIT License - see LICENSE file for details.