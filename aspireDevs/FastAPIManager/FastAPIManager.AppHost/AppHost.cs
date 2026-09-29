var builder = DistributedApplication.CreateBuilder(args);

var shouldStartTranscript = builder.Configuration["START_TRANSCRIPTS"] == "true";

// 1. Transcripts Analysis Service 
var transcriptsAnalysis = builder.AddPythonApp(
    "transcripts-analysis",
    "/home/labrigui/Software/python-software/investigations/transcripts_analysis/app",
    "main.py")
    .WithHttpEndpoint(port: 102, targetPort: 8100, name: "transcripts-analysis-http")
    .WithEnvironment("PYTHONPATH", "/home/labrigui/Software/python-software/investigations/transcripts_analysis")
    .WithVirtualEnvironment("/home/labrigui/Software/python-software/investigations/transcripts_analysis/.venv");

// 2. Investigative AI Service 
var investigativeAi = builder.AddPythonApp(
        "investigative-ai",
        "/home/labrigui/Software/python-software/investigations/investigative_ai/app",
        "main.py"
    )
    .WithHttpEndpoint(port: 103, targetPort: 8000, name: "investigative-ai-http")
    .WithEnvironment(
        "PYTHONPATH",
        "/home/labrigui/Software/python-software/investigations/investigative_ai"
    )
    .WithVirtualEnvironment("/home/labrigui/Software/python-software/investigations/investigative_ai/.venv");

var ttsAPI = builder.AddPythonApp(
        "tts-api",
        "/home/labrigui/Software/python-software/investigations/tts_api",
        "tts.py"
    )
    .WithHttpEndpoint(port: 104, targetPort: 5000, name: "tts-http")
    .WithEnvironment(
        "PYTHONPATH",
        "/home/labrigui/Software/python-software/investigations/tts_api"
    )
    .WithVirtualEnvironment("/home/labrigui/Software/python-software/investigations/tts_api/.venv");



// 3. Investigations Dashboard (React Vite Frontend using "npm run dev")
var investigationsDashboard = builder.AddNpmApp(
        "investigations-dashboard",
        "/home/labrigui/Software/python-software/investigations/investigations-dashboard",
        "dev" // Instructs Aspire to run 'npm run dev' instead of 'npm run start'
    )
    .WithHttpEndpoint(port: 3001, targetPort: 3000, name: "investigations-dashboard-http")
    .WithReference(transcriptsAnalysis)
    .WithReference(investigativeAi)
    .WithReference(ttsAPI);

builder.Build().Run();