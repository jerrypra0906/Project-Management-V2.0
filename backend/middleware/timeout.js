export function requestTimeout(ms) {
  return (req, res, next) => {
    const start = Date.now();
    const requestId = req.get('X-Request-Id');
    if (requestId) {
      res.setHeader('X-Request-Id', requestId);
    }

    let finished = false;
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      res.status(504).json({ error: `Request exceeded ${ms}ms timeout` });
    }, ms);

    res.on('finish', () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      const elapsed = Date.now() - start;
      res.setHeader('X-Response-Time-Ms', String(elapsed));
    });

    res.on('close', () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
    });

    next();
  };
}

