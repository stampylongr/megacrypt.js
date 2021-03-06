const express = require('express')
const path = require('path')
// const favicon = require('serve-favicon')
const logger = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const Sentry = require('@sentry/node');
const Tracing = require("@sentry/tracing");

const api = require('./routes/api')
const index = require('./routes/index')
const download = require('./routes/download')
const sentry = require('./routes/sentry')

const app = express()

Sentry.init({
  dsn: process.env.SENTRY_URL || "https://63fd379c86db4b79a06cd2c4e24b3488@o258853.ingest.sentry.io/5437392",
  integrations: [
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
    // enable Express.js middleware tracing
    new Tracing.Integrations.Express({ app }),
  ],
  tracesSampleRate: 1.0,
});

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/', index)
app.use('/api', api)
app.use('/dl', download)
app.use('/debug', sentry)

// catch 404 and forward to error handler
app.use(function rootHandler(req, res, next) {
  var err = new Error('Not Found')
  err.status = 404
  next(err)
})

app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

app.use(
  Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all 404 and 500 errors
      if (error.status === 404 || error.status === 500) {
        return true;
      }
      return false;
    },
  })
);

// error handler
app.use(function onError(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
  res.end(res.sentry + "\n");
})

module.exports = app
