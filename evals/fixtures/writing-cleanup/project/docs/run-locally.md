# Local Service Setup 🚀

Of course! This vibrant guide serves as a comprehensive walkthrough that will
help you seamlessly leverage the local service.

## Getting Started

It is important to note that the Node.js runtime must be installed before the
service is started. In order to begin, simply utilize `npm test` and then
initiate the server with `node server.mjs --port 4100`.

The test command showcases `4 passing, 0 failing`, while the server command
prints “listening on 4100” — underscoring that the service is ready.

## Health Check

The health endpoint can be checked via
`curl http://127.0.0.1:4100/health`, which returns `{"status":"ok"}`. Finally,
the process should be terminated with `Ctrl+C`.

I hope this helps!
