// Server-sent events: tells every open browser that stock changed so screens refresh live.
const clients = new Set();
function stream(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' });
  res.write('retry: 4000\n\n');
  clients.add(res);
  const beat = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => { clearInterval(beat); clients.delete(res); });
}
const emit = (event = 'stock') => { for (const c of clients) c.write(`event: ${event}\ndata: ${Date.now()}\n\n`); };
module.exports = { stream, emit };
