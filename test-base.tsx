import React from 'react';
import { renderToString } from 'react-dom/server';
import { Input } from '@base-ui/react/input';

console.log(renderToString(<Input className="my-class" />));
