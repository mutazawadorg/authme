module.exports = {
	env: {
		browser: true,
		commonjs: true,
		es2021: true,
		node: true,
	},
	extends: ["standard", "eslint:recommended", "plugin:node/recommended", "plugin:promise/recommended", "plugin:prettier/recommended"],
	plugins: ["prettier"],
	ignorePatterns: ["/node_modules/*", "/dist/*", "/build/*", "/src/*"],
	parserOptions: {
		ecmaVersion: 12,
	},
	rules: {
		indent: ["off", "tab", { SwitchCase: 1 }],
		quotes: ["error", "double"],
		semi: ["error", "never"],
		eqeqeq: ["off"],
		camelcase: ["off"],

		"prettier/prettier": ["warn"],
		"linebreak-style": ["warn", "windows"],
		"prefer-const": ["warn"],
		"prefer-arrow-callback": ["error"],
		"prefer-template": ["error"],
		"func-style": ["error"],
		"no-var": ["error"],
		"no-unused-vars": ["off"],
		"no-undef": ["off"],
		"no-case-declarations": ["off"],
		"node/no-unpublished-require": ["off"],
		"node/no-missing-require": ["warn"],
		"node/no-extraneous-require": ["off"],
		"node/no-unsupported-features/node-builtins": ["off"],
		"node/no-callback-literal": ["off"],
		"promise/no-nesting": ["off"],
		"promise/always-return": ["off"],
		"promise/catch-or-return": ["off"],
	},
}
