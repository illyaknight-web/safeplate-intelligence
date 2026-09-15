import corpus from '../../validation-corpus.json' with {type:'json'};
import {runBacktest} from './lib/backtesting.mjs';
export default async()=>Response.json(runBacktest(corpus),{headers:{'cache-control':'no-store'}});
export const config={path:'/api/backtest-report'};
