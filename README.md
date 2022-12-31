# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template


## setup

- Cloud 9 Instance Type t2.midium
- Volume expanded (20G)

```
bash resize.sh 20
```

## Git

```
$ cd ~/.ssh

$ ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

$ eval "$(ssh-agent -s)"

$ ssh-add ~/.ssh/id_rsa

### 公開鍵をGitHubに登録↓
$ cat ~/.ssh/id_rsa.pub

### 疎通確認
$ ssh -T git@github.com

$ git config --global user.name <user.name>
$ git config --global user.email <user.email>

$ git remote set-url origin <ssh url>
```

## Run

```
$ npm install
$ cdk synth
$ cdk bootstrap
$ MSG_CHANNEL_SECRET=< your secret >
$ MSG_CHANNEL_ACCESS_TOKEN=< your access token >
$ cdk deploy \
-c MSG_CHANNEL_SECRET=${MSG_CHANNEL_SECRET} \
-c MSG_CHANNEL_ACCESS_TOKEN=${MSG_CHANNEL_ACCESS_TOKEN}
```
