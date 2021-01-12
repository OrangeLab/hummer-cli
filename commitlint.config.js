module.exports = {
  extends: ['@commitlint/config-angular'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'WIP',     // 开发中
        'feat',     // 新特性
        'improvement', // 加强现有特性
        'fix',      // 修补bug
        'refactor', // 重构
        'docs',     // 文档
        'test',     // 单元测试
        'config',   // 配置文件
        'style',    // 格式更改
        'perf',     // 性能提升
        'ci',       // ci
        'revert',   // 版本回退
        'chore',    // 其他修改
        'build', // 编译相关修改，如依赖、编译命令
      ],
    ],
    'type-empty': [2, 'never'],               // type不能为空
    'type-case': [0, 'always', 'lower-case'], // type不限制大小写
    'subject-empty': [2, 'never'],            // subject（简短得描述）不能为空
    'subject-max-length': [1, 'always', 50],  // subject最大长度，超出只会警告，不阻止提交
    'body-leading-blank': [1, 'always'],
    'footer-leading-blank': [1, 'always'],
    'header-max-length': [2, 'always', 72],
  }
}