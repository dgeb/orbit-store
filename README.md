# OrbitStore [![Build Status](https://secure.travis-ci.org/orbitjs/orbit-store.png?branch=master)](http://travis-ci.org/orbitjs/orbit-store)

The OrbitStore library includes a `Store` in-memory data source for
[Orbit.js](https://github.com/orbitjs/orbit-core).

## Dependencies

OrbitStore is dependent upon [orbit-core](https://github.com/orbitjs/orbit-core/)
and [RxJS](https://github.com/Reactive-Extensions/RxJS).

## Installation

```
npm install orbit-store
```

## Configuration

TODO

## Contributing

### Installation

Install the CLI for [Broccoli](https://github.com/broccolijs/broccoli) globally:

```
npm install -g broccoli-cli
```

Install other dependencies:

```
npm install
```

### Building

Distributions can be built to the `/dist` directory by running:

```
npm run build
```

### Testing

#### CI Testing

Test in CI mode by running:

```
npm test
```

Or directly with testem (useful for configuring options):

```
testem ci
```

#### Browser Testing

Test within a browser
(at [http://localhost:4200/tests/](http://localhost:4200/tests/)) by running:

```
npm start
```

Or directly with `broccoli` (useful for configuring the port, etc.):

```
broccoli serve
```

### Generating Documentation

Generate docs in the `/docs` directory:

```
npm run docs
```

## License

Copyright 2016 Cerebris Corporation. MIT License (see LICENSE for details).
