# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)

## [Unreleased]
- Better refresh algorithm.

## [1.5.1] - 2018-03-29
### Added
- `Place` method to the container that returns current page number, so user can modify it.

### Fixed
- Max padding calculation goes through offsets calculation.

### Changed
- Remove port update event.

## [1.4.0] - 2018-03-20
### Added
- Virtual paddings for each of the pairs `left-right`, `top-bottom` try to be the same now.
- Endpoints for the dom perfomance libraries, like `fastdom`.

### Fixed
- Unnessasary digest calls.

[Unreleased]: https://github.com/klumba12/vscroll/compare/v1.5.1...HEAD
[1.5.1]: https://github.com/qgrid/ng/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/qgrid/ng/compare/v1.4.0...v1.5.0