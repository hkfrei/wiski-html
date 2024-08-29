# WISKI HTML SERVICE

### PURPOSE

This Repository contains a node.js/express.js app, which queries the [WISKI DB](https://www.innetag.ch/monitoring/wiski/#wiski) and returns HTML.
The main goal is to make it easier for developers to display station information of a certain
WISKI station. Because this function returns HTML and not a format like JSON, it can be used to populate
for instance a info window on a web map very easy.

### TEST

run the app:<br /> `$ npm start` <br />
-> open localhost:8080 in Browser

### DEPLOY

#### A Continuous Deployment to Google Cloud Run is implemented see https://github.com/hkfrei/cd-google-cloud-run.

The app will be updated on every push to the main branch. The steps below are no more necessary unless you want to deploy manually.

<hr />

make sure, the geourjs project is active:<br />

```
gcloud config configurations list
```

build your container image using Cloud Build by running the following command from the directory containing the Dockerfile<br />

```
gcloud builds submit --tag gcr.io/geourjs/wiski-html
```

You can list all the container images associated with your current project using this command:

```
gcloud container images list
```

If you would like to run and test the application locally from Cloud Shell, you can start it using this standard docker command:

```
docker run -d -p 8080:8080 gcr.io/geourjs/wiski-html
```

Deploying your containerized app to Cloud Run is done using the following command:

```
gcloud run deploy wiski-html   --image gcr.io/geourjs/wiski-html   --platform managed   --region europe-west6   --allow-unauthenticated --set-env-vars NODE_ICU_DATA=node_modules/full-icu
```

### SERVICE URL

[https://wiski-html-h2eptfuxza-oa.a.run.app/](https://wiski-html-h2eptfuxza-oa.a.run.app/)

### GET A COPY OF THIS REPOSITORY

`git clone git@github.com:hkfrei/wiski-html.git`

### AUTHOR

Hanskaspar Frei, Karten-Werk GmbH.

### LICENSE

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
