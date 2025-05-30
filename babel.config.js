module.exports = {
  plugins: ['@babel/plugin-transform-arrow-functions'],
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          chrome: '60',
          firefox: '60',
          ie: '11',
        },
        corejs: 3,
        useBuiltIns: 'usage',
      },
    ],
  ],
}
