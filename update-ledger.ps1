$ErrorActionPreference = "Stop"

$node = "C:\Users\dwinger\AppData\Local\OpenAI\Codex\bin\node.exe"
$script = Join-Path $PSScriptRoot "scripts\fetch-yesterday.js"

& $node $script
