# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)

## [Unreleased]
- Better refresh algorithm.

## [1.5.3] - 2018-04-25
### Fixed
- ES5 compatible.

## [1.5.2] - 2018-04-03
### Fixed
- Reject data fetching promise on container reset.

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

[Unreleased]: https://github.com/klumba12/vscroll/compare/v1.5.3...HEAD
[1.5.3]: https://github.com/qgrid/ng/compare/v1.5.3...v1.5.2
[1.5.2]: https://github.com/qgrid/ng/compare/v1.5.2...v1.5.1
[1.5.1]: https://github.com/qgrid/ng/compare/v1.5.1...v1.5.0
[1.5.0]: https://github.com/qgrid/ng/compare/v1.4.0...v1.5.0