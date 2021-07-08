var gitalk = new Gitalk({
  clientID: '07a26b0254dc16f99e22',
  clientSecret: '56213940a086e407400372f95ca7aeee24c8a630',
  repo: 'lsdsjy.github.io',
  owner: 'lsdsjy',
  admin: ['lsdsjy'],
  language: 'zh-CN',
})

gitalk.render('gitalk-container')
