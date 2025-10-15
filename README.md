# vistech

This version marks the migration of the Reusable Visualization Techniques Module to a web environment, with a specific focus on bar chart techniques.
The structure has been adapted to allow direct testing in the browser, with a participant registration interface and automated execution of experimental tasks.

# Main Features

* Updated `BarChart.js` class: Responsible for generating different bar chart strategies based on the experiment parameters.
* Participant registration page (`cadastro_user.html`): Registration interface with automatic redirection to the testing environment (`test_user_barchart.html`).
* Additional demonstration page (`teste_barchart_padrao.html`): Displays a bar chart using the *Perspective Scale Break* technique. Includes buttons to download the chart in SVG or PNG format, facilitating its use in reports, articles, and other visual materials.
* Web-compatible architecture: Can be run locally or hosted on servers (simple HTTP server) without additional installation requirements.

# How to Use

Open the participant registration page

* In your browser, open the file `cadastro_user.html`.
* Fill in the required information in the form.

Run the tests

* After submitting the registration form, you will be automatically redirected to the `test_user_barchart.html` page.
* This page presents the visualization techniques discussed in the article, with all datasets and tasks used in the original study.

Complete and save the data

* Once all tasks are completed, the generated data will be automatically saved in the same format used in the experiment described in the paper, allowing direct comparison of results.

