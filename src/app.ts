import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { isCelebrateError } from 'celebrate';

import envConfig from './config/env.config';
import logger from './config/log.config';
import router from './routes';
import { ProxyMiddleware } from './middlewares';

import { resError } from './utils/handler';
import ErrorException from './exceptions/form.exception';
import { notFoundRoute, badData } from './exceptions/definition.exception';

const app: express.Application = express();

const { port } = envConfig;

// cors
const corsOptions: cors.CorsOptions = {   
  credentials: true,
  methods: [ 'GET','POST','PUT','DELETE','PATCH' ],
  preflightContinue: false,
};
app.use( cors( corsOptions ) );

// favicon 204
app.get( '/favicon.ico', ( req: Request, res: Response ) => res.sendStatus( 204 ) );

// incoming log
app.use( ({ hostname, ip, method, url, headers, body }: Request, res: Response, next: NextFunction ) => {
  logger.info({ hostname, ip, method, url, headers, body });
  next();
});

// proxy setting
app.use( ProxyMiddleware );

app.use( express.json({ limit: '50mb' }) );
app.use(
  express.urlencoded({
    limit: '50mb',
    extended: false,
    parameterLimit: 1000000,
  })
);

// health check end point
app.use( '/actuator/health', ( req: Request, res: Response ) => {
  res.send({ resultCode: 0, resultMessage: 'OK' }); 
});

// service router
app.use( router );

// server on
app.listen( port , async () => {
  logger.info({ serverStart : `[SERVER] Auth server start on port ${port}` });
});

// Unknown route error
app.use( ( req: Request, res: Response, next: NextFunction ) => {
  return next( new ErrorException( notFoundRoute ) );
});

// celebrate exception
app.use( ( error: ErrorException, req: Request, res: Response, next: NextFunction ) => {
  if ( !isCelebrateError( error ) ) {
    return next( error );
  }
  throw new ErrorException( badData );
});

// exception middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use( ( error: ErrorException, req: Request, res: Response, next: NextFunction ) => {
  resError( res, error );
});

