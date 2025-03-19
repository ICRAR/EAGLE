#
#    ICRAR - International Centre for Radio Astronomy Research
#    (c) UWA - The University of Western Australia, 2016
#    Copyright by UWA (in the framework of the ICRAR)
#    All rights reserved
#
#    This library is free software; you can redistribute it and/or
#    modify it under the terms of the GNU Lesser General Public
#    License as published by the Free Software Foundation; either
#    version 2.1 of the License, or (at your option) any later version.
#
#    This library is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
#    Lesser General Public License for more details.
#
#    You should have received a copy of the GNU Lesser General Public
#    License along with this library; if not, write to the Free Software
#    Foundation, Inc., 59 Temple Place, Suite 330, Boston,
#    MA 02111-1307  USA
#
"""
This is the main module of the EAGLE server side code.
"""
import argparse
import base64
import datetime
import json
import logging
import os
import sys
import tempfile
import six
import subprocess

import urllib.request
import ssl

import github
import gitlab
import pkg_resources
from flask import Flask, request, render_template, jsonify, send_from_directory

import config.config
from config.config import GITHUB_DEFAULT_REPO_LIST
from config.config import GITLAB_DEFAULT_REPO_LIST
from config.config import STUDENT_GITHUB_DEFAULT_REPO_LIST
from config.config import SERVER_PORT


class GraphException(Exception):
    """
    Exception class will be used to throw exceptions when graph verification
    """
    pass


if sys.version_info[0] == 2:
    import errno

    class FileExistsError(OSError):
        def __init__(self, msg):
            super(FileExistsError, self).__init__(errno.EEXIST, msg)

#NOTE: this global variable is copied rather than imported
#      because it can be overwritten by the user's command line
TEMP_FILE_FOLDER = config.config.TEMP_FILE_FOLDER

templdir = pkg_resources.resource_filename(__name__, "../templates")
staticdir = pkg_resources.resource_filename(__name__, "../static")
srcdir = pkg_resources.resource_filename(__name__, "../src")

app = Flask(__name__, template_folder=templdir, static_folder=staticdir)
app.config.from_object("config")

version = "Unknown"
commit_hash = "Unknown"

# first look for the version and commit_hash in the VERSION file
# that was generated during the build process
try:
    with open(staticdir+"/VERSION") as vfile:
        for line in vfile.readlines():
            if "SW_VER" in line:
                version = line.split("SW_VER ")[1].strip()[1:-1]
                continue
            if "COMMIT_HASH" in line:
                commit_hash = line.split("COMMIT_HASH ")[1].strip()[1:-1]
except Exception as e:
    print(f"Unable to load VERSION file: {e}")

# if the first method was unsuccessful, then run some git commands
# to find the version and commit_hash
if version == "Unknown" and commit_hash == "Unknown":
    try:
        version = subprocess.run(["git", "describe", "--abbrev=0", "--tags"], capture_output=True, text=True).stdout.strip() + " (dev)"
        commit_hash = subprocess.run(["git", "rev-parse", "--short=8", "HEAD"], capture_output=True, text=True).stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error running git command: {e}")
    except FileNotFoundError:
        print("Git executable not found. Ensure git is installed and in the system PATH.")
    except Exception as e:
        print(f"Unexpected error determining version: {e}")

print("Version: " + version + " Commit Hash: " + commit_hash)

@app.route("/")
def index():
    """
    FLASK GET routing method for '/'

    Defines what is returned when the base URL is called.
    The following URL GET parameters are defined here in addition:

    service
    repository
    branch
    path
    filename

    IF the URL does not specify a graph to load, the default template with no additional information is rendered.
    """
    service    = request.args.get("service")
    repository = request.args.get("repository")
    branch     = request.args.get("branch")
    path       = request.args.get("path")
    filename   = request.args.get("filename")
    url        = request.args.get("url")
    mode       = request.args.get("mode")

    # if the url does not specify a graph to load, just send render the default template with no additional information
    if service is None:
        if mode is None:
            return render_template("base.html", version=version, commit_hash=commit_hash)
        else:
            return render_template("base.html", version=version, commit_hash=commit_hash, mode=mode)

    return render_template("base.html", version=version, commit_hash=commit_hash, auto_load_service=service, auto_load_repository=repository, auto_load_branch=branch, auto_load_path=path, auto_load_filename=filename, auto_load_url=url)


@app.route('/src/<path:filename>')
def send_src(filename):
    """
    FLASK GET routing method for '/src/<path:filename>'

    Enables debugging in a docker based environment, else the TS files
    are not accessible.
    """
    return send_from_directory(srcdir, filename)


@app.route("/saveFileToLocal", methods=["POST"])
def save():
    """
    FLASK POST routing method for '/saveToLocalFile'

    Saves a file to local computer.
    """
    content = request.get_json(silent=True)
    temp_file = tempfile.TemporaryFile()

    try:
        content["modelData"]["lastModifiedDatetime"] = datetime.datetime.now().timestamp()

        json_string = json.dumps(content)
        if sys.version_info < (3, 2, 0):
            temp_file.write(json_string)
        else:
            temp_file = tempfile.TemporaryFile(mode="w+t")
            temp_file.write(json.dumps(content, indent=4, sort_keys=True))

        # Reset the seeker
        temp_file.seek(0)
        string = temp_file.read()
        # Indent json for human readable formatting.
        graph = json.loads(string)
        json_data = json.dumps(graph, indent=4)
        return json_data
    finally:
        temp_file.close()


@app.route("/openRemoteFileLocalServer/<filetype>/<path:filename>", methods=["POST"])
def open_file(filetype, filename):
    """
    FLASK POST routing method for '/openRemoteFileLocalServer/<filetype>/<path:filename>'

    Opens and retruns a JSON file on a local server
    """
    path = request.data.decode().strip("/")
    path = os.path.join(TEMP_FILE_FOLDER, path)
    norm_path = os.path.join(os.path.normpath(path), filename)

    json_data = open(norm_path, "r+")
    data = json.load(json_data)
    response = app.response_class(
        response=json.dumps(data), status=200, mimetype="application/json"
    )
    return response


@app.route("/getGitHubRepositoryList", methods=["GET"])
def get_git_hub_repository_list():
    """
    FLASK GET routing method for '/getGitHubRepositoryList'

    Returns the list of defined default GitHub repositories.
    """
    return jsonify(GITHUB_DEFAULT_REPO_LIST)


@app.route("/getGitLabRepositoryList", methods=["GET"])
def get_git_lab_repository_list():
    """
    FLASK GET routing method for '/getGitHubRepositoryList'

    Returns the list of defined default GitLab repositories.
    """
    return jsonify(GITLAB_DEFAULT_REPO_LIST)


@app.route("/getStudentRepositoryList", methods=["GET"])
def get_student_repository_list():
    """
    FLASK GET routing method for '/getStudentRepositoryList'

    Returns the list of defined default Student repositories.
    """
    return jsonify(STUDENT_GITHUB_DEFAULT_REPO_LIST)


def extract_folder_and_repo_names(repo_name):
    """
    If repository name has more than one slash, then after the second slash it is a folder name in that repository.
    E.g. repo = <username or organisation name>/<reponame>/<folder>. The Github library considers repository name
    as <..>/<reponame>

    Extract folder name and update repository name to the true one.
    """
    folder_name = ""
    if repo_name.count("/") > 1:
        folder_name = repo_name.split("/", 2)[2]
        repo_name_true = repo_name.split("/" + folder_name, 1)[0]
        repo_name = repo_name_true
    return folder_name, repo_name


# NOTE: largely made obsolete by get_git_hub_files_all()
@app.route("/getGitHubFiles", methods=["POST"])
def get_git_hub_files():
    """
    FLASK POST routing method for '/getGitHubFiles'

    Returns a JSON list of files in a GitHub repository. Both the repository name and the access token have to passed in the POST content.
    """
    content = request.get_json(silent=True)
    repo_name = content["repository"]
    repo_token = content["token"]

    # Extracting the true repo name and repo folder.
    folder_name, repo_name = extract_folder_and_repo_names(repo_name)

    g = github.Github(repo_token)
    repo = g.get_repo(repo_name)

    # Set branch to master.
    try:
        master_ref = repo.get_git_ref("heads/master")
        master_sha = master_ref.object.sha
    except github.GithubException as e:
        # repository might be empty
        print(
            "Error getting ref to git repo! Repo: {0} Status: {1} Data: {2}".format(
                str(repo_name), e.status, e.data
            )
        )
        return jsonify({"": []})

    # Getting repository file list.
    base_tree = repo.get_git_tree(master_sha, recursive=False)

    # Building a dictionary of repository's content {path: filename}.
    d = {}
    for el in base_tree.tree:
        # Flag for whether it is a path in the given repository folder.
        is_in_folder = el.path.startswith(folder_name + "/")
        # Only show files that are located in the given repository folder.
        if folder_name == "" or is_in_folder:
            elpath = el.path
            if is_in_folder:
                # Extract path inside the given folder.
                elpath = elpath.split(folder_name + "/", 1)[1]

            # Folder.
            if el.type == "tree":
                path = elpath
                if not (path in d.keys()):
                    d[path] = list()

            # File.
            if el.type == "blob":
                path = os.path.dirname(elpath)
                filename = os.path.basename(elpath)
                if path in d.keys():
                    d[path].append(filename)
                else:
                    d[path] = list()
                    d[path].append(filename)

    return jsonify(d)


@app.route("/getGitHubFilesAll", methods=["POST"])
def get_git_hub_files_all():
    """
    FLASK POST routing method for '/getGitHubFilesAll'

    Returns the list files in a GitHub repository. The POST request content is a JSON string containing repository, branch and token.
    """
    content = request.get_json(silent=True)

    try:
        repo_name = content["repository"]
        repo_branch = content["branch"]
        repo_token = content["token"]
        repo_path = content["path"]
    except KeyError as ke:
        print("KeyError {1}: {0}".format(str(ke), repo_name))
        return jsonify({"error":"Repository, Branch or Token not specified in request"})

    # Extracting the true repo name and repo folder.
    folder_name, repo_name = extract_folder_and_repo_names(repo_name)
    g = github.Github(repo_token)

    try:
        repo = g.get_repo(repo_name)
    except github.UnknownObjectException as uoe:
        print("UnknownObjectException {1}: {0}".format(str(uoe), repo_name))
        return jsonify({"error":uoe.message})

    # get results
    d = parse_github_folder(repo, repo_path, repo_branch)

    # if unable to parse github folder, return the error

    if type(d) is not dict:
        print("Unable to parse github folder:" + str(d))
        return jsonify({"error":str(d)})

    # return correct result
    return jsonify(d)


@app.route("/getGitLabFilesAll", methods=["POST"])
def get_git_lab_files_all():
    """
    FLASK POST routing method for '/getGitLabFilesAll'

    Returns the list files in a GitLab repository. The POST request content is a JSON string containing repository, branch and token.
    """
    content = request.get_json(silent=True)

    try:
        repo_name = content["repository"]
        repo_branch = content["branch"]
        repo_token = content["token"]
        repo_path = content["path"]
    except KeyError as ke:
        print("KeyError {1}: {0}".format(str(ke), repo_name))
        return jsonify({"error":"Repository, Branch or Token not specified in request"})

    gl = gitlab.Gitlab('https://gitlab.com', private_token=repo_token, api_version=4)

    try:
        gl.auth()
    except gitlab.exceptions.GitlabAuthenticationError as gae:
        print("GitlabAuthenticationError {1}: {0}".format(str(gae), repo_name))
        return jsonify({"error": "Gitlab Authentication Error. Access token may be invalid." + "\n" + str(gae)})

    try:
        project = gl.projects.get(repo_name)
        items = project.repository_tree(recursive='false', all=True, ref=repo_branch, path=repo_path)
    except gitlab.exceptions.GitlabGetError as gge:
        print("GitlabGetError {1}: {0}".format(str(gge), repo_name))
        return jsonify({"error": "Unable to get repository. Repository or branch name may be incorrect, or repository may be empty." + "\n" + str(gge)})

    d = parse_gitlab_folder(items, repo_path)

    # return correct result
    return jsonify(d)


@app.route("/getDockerImages", methods=["POST"])
def get_docker_images():
    """
    FLASK POST routing method for '/getDockerImages'

    Returns a list of public docker images for a given user on DockerHub. The POST request content is a JSON string containing the DockerHub user name.
    """
    content = request.get_json(silent=True)

    try:
        user_name = content["username"]
    except KeyError as ke:
        print("KeyError: {0}".format(str(ke)))
        return jsonify({"error":"Username not specified in request"})

    docker_url = "https://hub.docker.com/v2/repositories/" + user_name + "/"

    # avoid ssl errors when fetching a URL using urllib.request
    # https://stackoverflow.com/questions/50236117/scraping-ssl-certificate-verify-failed-error-for-http-en-wikipedia-org
    ssl._create_default_https_context = ssl._create_unverified_context

    with urllib.request.urlopen(docker_url) as url:
        data = json.loads(url.read().decode())
        #print(data)

    return jsonify(data)


@app.route("/getDockerImageTags", methods=["POST"])
def get_docker_image_tags():
    """
    FLASK POST routing method for '/getDockerImagesTag'

    Returns a list of tags for a certain docker image from the docker registry. The POST request content is a JSON string containing the image name.
    """
    content = request.get_json(silent=True)

    try:
        image_name = content["imagename"]
    except KeyError as ke:
        print("KeyError: {0}".format(str(ke)))
        return jsonify({"error":"Imagename not specified in request"})

    docker_url = "https://registry.hub.docker.com/v2/repositories/" + image_name + "/tags"

    # avoid ssl errors when fetching a URL using urllib.request
    # https://stackoverflow.com/questions/50236117/scraping-ssl-certificate-verify-failed-error-for-http-en-wikipedia-org
    ssl._create_default_https_context = ssl._create_unverified_context

    with urllib.request.urlopen(docker_url) as url:
        data = json.loads(url.read().decode())
        #print(data)

    return jsonify(data)


@app.route("/getExplorePalettes", methods=["POST"])
def get_explore_palettes():
    """
    FLASK POST routing method for '/getExplorePalettes'

    Returns a list of palettes from a repository. The POST request content is a JSON string containing the repository name, branch and access token.
    """
    content = request.get_json(silent=True)

    try:
        # NOTE: repo_service is not currently used
        repo_service = content["service"]
        repo_name = content["repository"]
        repo_branch = content["branch"]
        repo_token = content["token"]
    except KeyError as ke:
        print("KeyError {1}: {0}".format(str(ke), repo_name))
        return jsonify({"error":"Repository, Branch or Token not specified in request"})

    # Extracting the true repo name and repo folder.
    # TODO: Only GitHub supported here, add GitLab
    folder_name, repo_name = extract_folder_and_repo_names(repo_name)
    g = github.Github(repo_token)

    try:
        repo = g.get_repo(repo_name)
    except github.UnknownObjectException as uoe:
        print("UnknownObjectException {1}: {0}".format(str(uoe), repo_name))
        return jsonify({"error":str(uoe)}), 400

    # get results
    d = find_github_palettes(repo, "", repo_branch)

    # return correct result
    return jsonify(d)


@app.route("/saveFileToRemoteGithub", methods=["POST"])
def save_git_hub_file():
    """
    FLASK POST routing method for '/saveFileToRemoteGithub'

    Save a file to a GitHub repository. The POST request content is a JSON string containing the file name, repository name, branch, access token, the graph data in JSON format and a commit message.
    """
    # Extract parameters and file content from json.
    content = request.get_json(silent=True)
    filename = content["filename"]
    repo_name = content["repositoryName"]
    repo_branch = content["repositoryBranch"]
    repo_token = content["token"]
    graph = content["jsonData"]
    commit_message = content["commitMessage"]

    # Extracting the true repo name and repo folder.
    folder_name, repo_name = extract_folder_and_repo_names(repo_name)
    if folder_name != "":
        filename = folder_name + "/" + filename

    g = github.Github(repo_token)

    # get repo
    try:
        repo = g.get_repo(repo_name)
    except github.GithubException as e:
        print(
            "Error in get_repo({0})! Repo: {1} Status: {2} Data: {3}".format(
                "heads/" + repo_branch, str(repo_name), e.status, e.data
            )
        )
        return jsonify({"error": e.data["message"]}), 400

    # Set branch
    try:
        branch_ref = repo.get_git_ref("heads/" + repo_branch)
    except github.GithubException as e:
        # repository might be empty
        print(
            "Error in get_git_ref({0})! Repo: {1} Status: {2} Data: {3}".format(
                "heads/" + repo_branch, str(repo_name), e.status, e.data
            )
        )
        return jsonify({"error": e.data["message"]}), 400

    # get SHA from branch
    branch_sha = branch_ref.object.sha

    # Add repo and file name in the graph.
    graph["modelData"]["repo"] = repo_name
    graph["modelData"]["repoBranch"] = repo_branch
    graph["modelData"]["repoService"] = "GitHub"
    graph["modelData"]["filePath"] = filename
    # Clean the GitHub file reference.
    graph["modelData"]["repositoryUrl"] = ""
    graph["modelData"]["commitHash"] = ""
    graph["modelData"]["downloadUrl"] = ""
    graph["modelData"]["lastModifiedName"] = ""
    graph["modelData"]["lastModifiedEmail"] = ""
    graph["modelData"]["lastModifiedDatetime"] = 0

    # The 'indent=4' option is used for nice formatting. Without it the file is stored as a single line.
    json_data = json.dumps(graph, indent=4)

    # Commit to GitHub repo.
    latest_commit = repo.get_git_commit(branch_sha)
    base_tree = latest_commit.tree
    try:
        new_tree = repo.create_git_tree(
            [
                github.InputGitTreeElement(
                    path=filename, mode="100644", type="blob", content=json_data
                )
            ],
            base_tree,
        )
    except github.GithubException as e:
        # repository might not have permission
        print(
            "Error in create_git_tree({0})! Repo: {1} Status: {2} Data: {3}".format(
                "heads/" + repo_branch, str(repo_name), e.status, e.data
            )
        )
        return jsonify({"error": e.data["message"]}), 400

    new_commit = repo.create_git_commit(
        message=commit_message, parents=[latest_commit], tree=new_tree
    )
    branch_ref.edit(sha=new_commit.sha, force=False)

    return "ok"


@app.route("/saveFileToRemoteGitlab", methods=["POST"])
def save_git_lab_file():
    """
    FLASK POST routing method for '/saveFileToRemoteGitLab'

    Save a file to a GitLab repository. The POST request content is a JSON string containing the file name, repository name, branch, access token, the graph data in JSON format and a commit message.
    """
    # Extract parameters and file content from json.
    content = request.get_json(silent=True)
    filename = content["filename"]
    repo_name = content["repositoryName"]
    repo_branch = content["repositoryBranch"]
    repo_token = content["token"]
    graph = content["jsonData"]
    commit_message = content["commitMessage"]

    # Extracting the true repo name and repo folder.
    folder_name, repo_name = extract_folder_and_repo_names(repo_name)
    if folder_name != "":
        filename = folder_name + "/" + filename

    # get the data from gitlab
    gl = gitlab.Gitlab('https://gitlab.com', private_token=repo_token, api_version=4)
    gl.auth()
    project = gl.projects.get(repo_name)

    # Add repo and file name in the graph.
    graph["modelData"]["repo"] = repo_name
    graph["modelData"]["repoBranch"] = repo_branch
    graph["modelData"]["repoService"] = "GitLab"
    graph["modelData"]["filePath"] = filename
    # Clean the GitHub file reference.
    graph["modelData"]["repositoryUrl"] = ""
    graph["modelData"]["commitHash"] = ""
    graph["modelData"]["downloadUrl"] = ""
    graph["modelData"]["lastModifiedName"] = ""
    graph["modelData"]["lastModifiedEmail"] = ""
    graph["modelData"]["lastModifiedDatetime"] = 0

    # The 'indent=4' option is used for nice formatting. Without it the file is stored as a single line.
    json_data = json.dumps(graph, indent=4)

    # check if file exists, if it exists, then the 'get' and 'save' approach will be sufficient
    # if the file is new, then a GitlabGetError exception will be raised, and we try to create instead
    getSuccessful = True
    try:
        f = project.files.get(file_path=filename, ref=repo_branch)
        # update content
        f.content = json_data
        f.save(branch=repo_branch, commit_message=commit_message)
    except gitlab.GitlabHttpError as ghe:
        return jsonify({"error": str(ghe)}), 400
    except gitlab.GitlabGetError as gge:
        print("GitlabGetError {1}: {0}".format(str(gge), repo_name))
        getSuccessful = False

    # if the 'get' approach above was unsuccessful, then we try to create the file
    # if the 'create' approach fails, then send errors to the client
    if not getSuccessful:
        try:
            f = project.files.create({'file_path': filename,
                              'branch': repo_branch,
                              'content': json_data,
                              'commit_message': commit_message})
        except gitlab.GitlabHttpError as ghe:
            return jsonify({"error": str(ghe)}), 400
        except gitlab.GitlabCreateError as gce:
            return jsonify({"error": str(gce)}), 400


    return "ok"


@app.route("/openRemoteGithubFile", methods=["POST"])
def open_git_hub_file():
    """
    FLASK POST routing method for '/openRemoteGithubFile'

    Reads a file from a GitHub repository. The POST request content is a JSON string containing the file name, repository name, branch, access token.
    """
    content = request.get_json(silent=True)
    repo_name = content["repositoryName"]
    repo_branch = content["repositoryBranch"]
    repo_service = content["repositoryService"]
    repo_token = content["token"]
    filename = content["filename"]
    extension = os.path.splitext(filename)[1]

    #print("open_git_hub_file()", "repo_name", repo_name, "repo_service", repo_service, "repo_branch", repo_branch, "repo_token", repo_token, "filename", filename, "extension:" + extension + ":")

    # Extracting the true repo name and repo folder.
    folder_name, repo_name = extract_folder_and_repo_names(repo_name)
    if folder_name != "":
        filename = folder_name + "/" + filename

    g = github.Github(repo_token)
    try:
        repo = g.get_repo(repo_name)
    except Exception as e:
        print(e)
        return app.response_class(response=json.dumps({"error":str(e)}), status=404, mimetype="application/json")


    # get commits
    commits = repo.get_commits(sha=repo_branch, path=filename)
    most_recent_commit = commits[0]

    # get the file from this commit
    try:
        f = repo.get_contents(filename, ref=most_recent_commit.sha)
        download_url = f.download_url
        raw_data = f.decoded_content
    except github.GithubException as e:
        # first get the branch reference
        ref = repo.get_git_ref(f'heads/{repo_branch}')
        # then get the tree
        tree = repo.get_git_tree(ref.object.sha, recursive='/' in filename).tree
        # look for path in tree
        sha = [x.sha for x in tree if x.path == filename]
        if not sha:
            # well, not found..
            return app.response_class(response=json.dumps({"error":"File not found"}), status=404, mimetype="application/json")

        # use the sha to get the blob, then decode it
        blob = repo.get_git_blob(sha[0])
        b64 = base64.b64decode(blob.content)
        raw_data = b64.decode("utf8")

        # manually build the download url
        download_url = "https://raw.githubusercontent.com/" + repo_name + "/" + most_recent_commit.sha + "/" + filename
    except AssertionError as e:
        # download via http get
        import certifi
        import ssl
        raw_data = urllib.request.urlopen(download_url, context=ssl.create_default_context(cafile=certifi.where())).read()

    if extension != ".md":
        # parse JSON
        graph = json.loads(raw_data)

        if isinstance(graph, list):
            return app.response_class(response=json.dumps({"error":"File JSON data is a list, this file could be a Physical Graph instead of a Logical Graph."}), status=404, mimetype="application/json")

        if not "modelData" in graph:
            graph["modelData"] = {}

        # replace some data in the header (modelData) of the file with info from git
        graph["modelData"]["repo"] = repo_name
        graph["modelData"]["repoBranch"] = repo_branch
        graph["modelData"]["repoService"] = "GitHub"
        graph["modelData"]["filePath"] = filename

        graph["modelData"]["repositoryUrl"] = "TODO"
        graph["modelData"]["commitHash"] = most_recent_commit.sha
        graph["modelData"]["downloadUrl"] = download_url
        graph["modelData"]["lastModifiedName"] = most_recent_commit.commit.committer.name
        graph["modelData"]["lastModifiedEmail"] = most_recent_commit.commit.committer.email
        graph["modelData"]["lastModifiedDatetime"] = most_recent_commit.commit.committer.date.timestamp()

        # for palettes, put downloadUrl in every component
        if extension == ".palette":
            for component in graph["nodeDataArray"]:
                component["paletteDownloadUrl"] = download_url

        json_data = json.dumps(graph, indent=4)

        response = app.response_class(
            response=json.dumps(json_data), status=200, mimetype="application/json"
        )
    else:
        response = app.response_class(
            response=raw_data, status=200, mimetype="text/plain"
        )
    
    return response


@app.route("/deleteRemoteGithubFile", methods=["POST"])
def delete_git_hub_file():
    """
    FLASK POST routing method for '/deleteRemoteGithubFile'

    Deletes a file from a GitHub repository. The POST request content is a JSON string containing the file name, repository name, branch, access token.
    """
    content = request.get_json(silent=True)
    repo_name = content["repositoryName"]
    repo_branch = content["repositoryBranch"]
    repo_service = content["repositoryService"]
    repo_token = content["token"]
    filename = content["filename"]
    extension = os.path.splitext(filename)[1]

    #print("delete_git_hub_file()", "repo_name", repo_name, "repo_service", repo_service, "repo_branch", repo_branch, "repo_token", repo_token, "filename", filename, "extension:" + extension + ":")

    g = github.Github(repo_token)

    try:
        repo = g.get_repo(repo_name)
    except Exception as e:
        print(e)
        return app.response_class(response=json.dumps({"error":str(e)}), status=404, mimetype="application/json")

    # get commits
    commits = repo.get_commits(sha=repo_branch, path=filename)
    most_recent_commit = commits[0]

    # get the file from this commit
    try:
        f = repo.get_contents(filename, ref=most_recent_commit.sha)
        repo.delete_file(f.path, "File removed by EAGLE", f.sha, branch=repo_branch)
    except github.GithubException as e:
        return app.response_class(response=json.dumps({"error":str(e)}), status=404, mimetype="application/json")

    return json.dumps({'success':True}), 200, {'ContentType':'application/json'}


@app.route("/openRemoteGitlabFile", methods=["POST"])
def open_git_lab_file():
    """
    FLASK POST routing method for '/openRemoteGitlabFile'

    Reads a file from a GitLab repository. The POST request content is a JSON string containing the file name, repository name, branch, access token.
    """
    content = request.get_json(silent=True)
    repo_name = content["repositoryName"]
    repo_branch = content["repositoryBranch"]
    repo_service = content["repositoryService"]
    repo_token = content["token"]
    filename = content["filename"]
    extension = os.path.splitext(filename)[1]

    #print("open_git_lab_file()", "repo_name", repo_name, "repo_service", repo_service, "repo_branch", repo_branch, "repo_token", repo_token, "filename", filename, "extension:" + extension + ":")

    # Extracting the true repo name and repo folder.
    folder_name, repo_name = extract_folder_and_repo_names(repo_name)
    if folder_name != "":
        filename = folder_name + "/" + filename

    #print("folder_name", folder_name, "repo_name", repo_name, "filename", filename)

    # get the data from gitlab
    gl = gitlab.Gitlab('https://gitlab.com', private_token=repo_token, api_version=4)

    try:
        gl.auth()
    except Exception as e:
        print(e)
        return app.response_class(response=json.dumps({"error":str(e)}), status=404, mimetype="application/json")

    project = gl.projects.get(repo_name)

    try:
        f = project.files.get(file_path=filename, ref=repo_branch)
    except gitlab.exceptions.GitlabGetError as gle:
        print("GitLabGetError {0}/{1}/{2}: {3}".format(repo_name, repo_branch, filename, str(gle)))
        return app.response_class(response=json.dumps({"error":str(gle)}), status=404, mimetype="application/json")

    # get the decoded content
    raw_data = f.decode().decode("utf-8")

    if extension != ".md":
        # parse JSON
        graph = json.loads(raw_data)

        if not "modelData" in graph:
            graph["modelData"] = {}

        # add the repository information
        graph["modelData"]["repo"] = repo_name
        graph["modelData"]["repoBranch"] = repo_branch
        graph["modelData"]["repoService"] = "GitLab"
        graph["modelData"]["filePath"] = filename

        # TODO: Add the GitLab file information
        graph["modelData"]["repositoryUrl"] = "TODO"
        graph["modelData"]["commitHash"] = f.commit_id
        graph["modelData"]["downloadUrl"] = "TODO"
        graph["modelData"]["lastModifiedName"] = ""
        graph["modelData"]["lastModifiedEmail"] = ""
        graph["modelData"]["lastModifiedDatetime"] = 0

        # for palettes, put downloadUrl in every component
        if extension == ".palette":
            for component in graph["nodeDataArray"]:
                component["paletteDownloadUrl"] = "TODO"

        json_data = json.dumps(graph, indent=4)

        response = app.response_class(
            response=json.dumps(json_data), status=200, mimetype="application/json"
        )
    else:
        response = app.response_class(
            response=raw_data, status=200, mimetype="text/plain"
        )
        
    return response


@app.route("/deleteRemoteGitlabFile", methods=["POST"])
def delete_git_lab_file():
    """
    FLASK POST routing method for '/deleteRemoteGitlabFile'

    Deletes a file from a GitLab repository. The POST request content is a JSON string containing the file name, repository name, branch, access token.
    """
    content = request.get_json(silent=True)
    repo_name = content["repositoryName"]
    repo_branch = content["repositoryBranch"]
    repo_service = content["repositoryService"]
    repo_token = content["token"]
    filename = content["filename"]
    extension = os.path.splitext(filename)[1]

    #print("delete_git_lab_file()", "repo_name", repo_name, "repo_service", repo_service, "repo_branch", repo_branch, "repo_token", repo_token, "filename", filename, "extension:" + extension + ":")

    # Extracting the true repo name and repo folder.
    folder_name, repo_name = extract_folder_and_repo_names(repo_name)
    if folder_name != "":
        filename = folder_name + "/" + filename

    # get the data from gitlab
    gl = gitlab.Gitlab('https://gitlab.com', private_token=repo_token, api_version=4)

    try:
        gl.auth()
    except Exception as e:
        print(e)
        return app.response_class(response=json.dumps({"error":str(e)}), status=404, mimetype="application/json")

    project = gl.projects.get(repo_name)

    try:
        project.files.delete(file_path=filename, branch=repo_branch, commit_message="File removed by EAGLE")
    except gitlab.exceptions.GitlabDeleteError as gle:
        print("GitLabDeleteError {0}/{1}/{2}: {3}".format(repo_name, repo_branch, filename, str(gle)))
        return app.response_class(response=json.dumps({"error":str(gle)}), status=404, mimetype="application/json")

    return json.dumps({'success':True}), 200, {'ContentType':'application/json'}


@app.route("/openRemoteUrlFile", methods=["POST"])
def open_url_file():
    """
    FLASK POST routing method for '/openRemoteUrlFile'

    Reads a file from a URL. The POST request content is a JSON string containing the URL.
    """
    content = request.get_json(silent=True)
    url = content["url"]
    extension = os.path.splitext(url)[1]

    # download via http get
    import certifi
    import ssl
    try:
        raw_data = urllib.request.urlopen(url, context=ssl.create_default_context(cafile=certifi.where())).read()
    except Exception as e:
        print(e)
        return app.response_class(response=json.dumps({"error":str(e)}), status=404, mimetype="application/json")

    # parse JSON
    graph = json.loads(raw_data)

    if not "modelData" in graph:
        graph["modelData"] = {}

    # add the repository information
    graph["modelData"]["repo"] = ""
    graph["modelData"]["repoBranch"] = ""
    graph["modelData"]["repoService"] = "Url"
    graph["modelData"]["filePath"] = ""

    # add the GitLab file information
    graph["modelData"]["commitHash"] = ""
    graph["modelData"]["downloadUrl"] = url
    graph["modelData"]["lastModifiedName"] = ""
    graph["modelData"]["lastModifiedEmail"] = ""
    graph["modelData"]["lastModifiedDatetime"] = 0

    # for palettes, put downloadUrl in every component
    if extension == ".palette":
        for component in graph["nodeDataArray"]:
            component["paletteDownloadUrl"] = url

    json_data = json.dumps(graph, indent=4)

    response = app.response_class(
        response=json.dumps(json_data), status=200, mimetype="application/json"
    )
    return response


def parse_github_folder(repo, path, branch):
    """
    Helper method to parse the retrieve and parse the content of a github folder.
    """
    result = {"": []}

    # Getting repository file list
    try:
        contents = repo.get_contents(path, ref=branch)
    except github.GithubException as ghe:
        print("GitHubException {1} ({2}): {0}".format(str(ghe), repo.full_name, branch))
        return ghe.data["message"]

    while contents:
        file_content = contents.pop(0)

        if file_content.type == "dir":
            result[file_content.path] = file_content.name
        else:
            result[""].append(file_content.name)

    return result


def parse_gitlab_folder(items, path):
    """
    Helper method to parse the retrieve and parse the content of a gitlab folder.
    """
    result = {"": []}

    for item in items:
        name = item[u'name']
        path = item[u'path']
        type = item[u'type']

        if type == u'tree':
            result[path] = name
        if type == u'blob':
            result[""].append(name)

    return result


def find_github_palettes(repo, path, branch):
    """
    Helper method to parse the retrieve and parse palettes from a github folder.
    """
    result = []

    # Getting repository file list
    try:
        contents = repo.get_contents(path, ref=branch)
    except github.GithubException as ghe:
        print("GitHubException {1} ({2}): {0}".format(str(ghe), repo.full_name, branch))
        return ghe.data["message"]

    while contents:
        file_content = contents.pop(0)

        if file_content.type == "dir":
            palettes = find_github_palettes(repo, file_content.path, branch)
            for palette in palettes:
                result.append(palette)
        else:
            if file_content.name.endswith(".palette"):
                if '/' in file_content.path:
                    path_without_filename = file_content.path[:file_content.path.rindex('/')]
                else:
                    path_without_filename = ""
                result.append({"name":file_content.name, "path":path_without_filename})

    return result


def save_to_temp(lg_name, logical_graph):
    """
    Saves graph to temp folder.
    """
    try:
        new_path = os.path.join(TEMP_FILE_FOLDER, lg_name)

        # Overwrite file on disks.
        with open(new_path, "w") as outfile:
            json.dump(logical_graph, outfile, sort_keys=True, indent=4)
    except Exception as exp:
        raise GraphException(
            "Failed to save a pre-translated graph {0}:{1}".format(lg_name, str(exp))
        )
    finally:
        pass

    return new_path


def parse_args():
    """
    Parsing command line arguments and setting corresponding global variables.
    """
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-t", "--tempdir", required=False, help="physical graph template path (output)"
    )
    parser.add_argument(
        "-p",
        "--port",
        action="store",
        default=SERVER_PORT,
        help="EAGLE server port (%d by default)" % SERVER_PORT,
    )
    parser.add_argument(
        "-q",
        "--quiet",
        action="store_true",
        help="suppress info logging output from the server",

    )
    args = parser.parse_args()

    if args.tempdir is not None:
        global TEMP_FILE_FOLDER
        TEMP_FILE_FOLDER = args.tempdir

    # Create the temp folder if it does not esist.
    try:
        os.makedirs(TEMP_FILE_FOLDER)
    except (FileExistsError, OSError):
        pass

    return args


def main():
    """
    Main function of eagleServer, will run the APP indefinetly.
    """
    args = parse_args()
    logging.basicConfig(level=logging.INFO, stream=sys.stdout)

    if args.quiet:
        log = logging.getLogger('werkzeug')
        log.setLevel(logging.ERROR)

    app.run(host="0.0.0.0", debug=True, port=args.port)


if __name__ == "__main__":
    main()
