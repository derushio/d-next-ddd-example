/**
 * Entity Generator Prompt
 * 対話式でEntity生成に必要な情報を収集
 */
module.exports = [
  {
    type: 'input',
    name: 'name',
    message: 'Entity名（例: Order）:',
    validate: (input) => {
      if (!input) return 'Entity名は必須です';
      if (!/^[A-Z][a-zA-Z]+$/.test(input))
        return 'PascalCaseで入力してください';
      return true;
    },
  },
];
