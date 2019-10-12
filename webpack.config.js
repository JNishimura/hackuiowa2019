const path = require('path');

module.exports = {
	entry: "./src/bootstrap.tsx",
	output: {
		filename: "bundle.js",
		path: path.resolve(__dirname, 'dist'),
	},
	
	// Enable sourcemaps for debugging webpack's output.
	devtool: "eval",
	resolve: {
		// Add '.ts' and '.tsx' as resolvable extensions.
		extensions: [".webpack.js", ".web.js", ".ts", ".tsx", ".js"]
	},
	module: {
		rules: [
			{ test: /\.tsx?$/, loader: "ts-loader" }
		]
	}
};
