module.exports = {
    presets: [
      ["@babel/preset-env",
      {
        targets:{
          node:"current"
        }
      }]
    ],
    "plugins": [
      ["@babel/plugin-transform-runtime",
          {
              "regenerator": true
          }
      ],
      "@babel/plugin-proposal-class-properties"
  ],
  }