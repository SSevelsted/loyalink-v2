#!/bin/sh
set -e

HOMEBREW_NO_AUTO_UPDATE=1 brew install cocoapods

cd "$CI_PRIMARY_REPOSITORY_PATH/ios/App"
pod install
