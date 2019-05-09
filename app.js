const camp = require('camp');
const { Study, Submission } = require('./model');
const settings = require('./.settings.json');

(async function() {
  const study = await Study.load();

  const port = settings.http.port;
  const hostname = settings.http.hostname;
  const protocol = settings.http.protocol;
  const corsOrigins = settings.http.cors.origins;
  const sc = camp.start({port, secure: settings.http.protocol === "https"});
  console.log(`${protocol}://${hostname}:${port}`);

  sc.post('/submissions', (req, res) => {
    req.setEncoding('utf8');
    (async function() {
      let body = '';
      for await (const k of req) { body += k; }
      let payload;
      try {
        payload = JSON.parse(body);
      } catch (e) {
        res.statusCode = 400;
        return res.json({errors: [
          {code: 'invalid_payload', message: 'Request is not valid JSON'}]
        });
      }

      const submission = new Submission(payload.submission);
      const errors = submission.validate();
      if (errors.length > 0) {
        res.statusCode = 400;
        return res.json({errors});
      }
      study.add(submission);
      const origin = req.headers.origin;
      if (origin === corsOrigin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      res.end();
      await study.save();

    })().catch(e => {
      res.statusCode = 500;
      res.json({errors: [{
        code: "semantic",
        message: e.stack,
      }]});
    });
  });

  sc.get('/statistics', (req, res) => res.json(study.statistics));
})()
