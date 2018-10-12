import ts from 'rollup-typescript';
import cjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';

const extensions = '.js .ts'.split(' ');

export default {
  input: './lib/ical/index.ts',
  output: {
    file: './build/ical.js',
    format: 'cjs',
    banner: '/* eslint-disable */',
  },
  plugins: [
    ts(),
    babel({
      extensions,
      comments: false,
      plugins: [
        ['@babel/plugin-proposal-object-rest-spread', { loose: true, useBuiltIns: true }],
        require('./tools/babel/typescript-enum')({ constEnum: true }),
      ],
    }),
    cjs({
      extensions,
    })
  ]
};
