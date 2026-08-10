/**
 * UseCase Generator Prompt
 * 対話式でUseCase生成に必要な情報を収集
 */
module.exports = [
  {
    type: 'input',
    name: 'name',
    message: 'UseCase名（例: CreateOrder）:',
    validate: (input) => {
      if (!input) return 'UseCase名は必須です';
      if (!/^[A-Z][a-zA-Z]+$/.test(input))
        return 'PascalCaseで入力してください';
      return true;
    },
  },
  {
    type: 'input',
    name: 'domain',
    message: 'ドメイン名（例: order）:',
    validate: (input) => {
      if (!input) return 'ドメイン名は必須です';
      if (!/^[a-z]+$/.test(input)) return '小文字で入力してください';
      return true;
    },
  },
  {
    type: 'confirm',
    name: 'withRepository',
    message: 'Repositoryを注入しますか？',
    default: true,
  },
  {
    type: 'input',
    name: 'repository',
    message: 'Repository名（例: Order）:',
    when: (answers) => answers.withRepository,
    validate: (input) => {
      if (!input) return 'Repository名は必須です';
      return true;
    },
  },
];
