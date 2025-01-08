cd app/gammaray/api
rm -R dist/
yarn
yarn tsc
cp package.json dist
cp README.md dist
cd dist
npm publish --access=public
