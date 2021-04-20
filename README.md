# use-pubsub

> A hooks for React to publish or subscribe also outside of React

[![NPM](https://img.shields.io/npm/v/use-pubsub.svg)](https://www.npmjs.com/package/use-pubsub) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save use-pubsub
```

## Usage

```tsx
import * as React from 'react'

import { useMyHook } from 'use-pubsub'

const Example = () => {
  const example = useMyHook()
  return (
    <div>
      {example}
    </div>
  )
}
```

## License

MIT © [AZagatti](https://github.com/AZagatti)

---

This hook is created using [create-react-hook](https://github.com/hermanya/create-react-hook).
