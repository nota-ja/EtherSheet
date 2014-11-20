A Note for Cloud Foundry
========================

You may deploy EtherSheet on Cloud Foundry via the following instruction.

## Prepare MySQL service

Ethersheet uses a MySQL database. You should create it as a MySQL service before deployment:
```
cf create-service mysql PLAN INSTANCE
```
For more information about service creation in Cloud Foundry, please refer to:
http://docs.cloudfoundry.org/devguide/services/adding-a-service.html

Below is an example:
```
cf create-service mysql	default es-mysql
```

## Prepare application manifest file

To bind a service on deployment, it's better to use an application manifest file. It's a YAML file defaultly placed in your current working directory.

For detailed information about application manifest file, please refer to:
http://docs.cloudfoundry.org/devguide/deploy-apps/manifest.html

An example is provided as `examples/manifest-example.yml`. You may copy the file to the top directory of this repository, rename it to `manifest.yml`, and edit it as you want.
```
cp examples/manifest-example.yml ./manifest.yml
emacs manifest.yml
...
```

## Push application

Everything is ready.

Just do:
```
cf push APPLICATION_NAME
```
and wait ... a few minites.

Enjoy!
