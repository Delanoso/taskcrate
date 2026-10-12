module.exports = {
  apps: [
    {
      name: "taskcrate",
      cwd: "/opt/taskcrate",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3847 -H 127.0.0.1",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3847",
      },
    },
  ],
};
