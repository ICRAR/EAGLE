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
import argparse
import json
import logging
import os
import sys
import tempfile

import github
import gitlab
import pkg_resources
from flask import Flask, request, render_template, jsonify

import config.config
from config.config import DEFAULT_TRANSLATOR_URL
from config.config import GITHUB_DEFAULT_REPO_LIST
from config.config import GITLAB_DEFAULT_REPO_LIST
from config.config import SERVER_PORT


class GraphException(Exception):
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

app = Flask(__name__, template_folder=templdir, static_folder=staticdir)
app.config.from_object("config")

try:
    with open("VERSION") as vfile:
        for line in vfile.readlines():
            if "SW_VER" in line:
                version = line.split("SW_VER ")[1].strip()[1:-1]
                break
except:
    version = "Unknown"
print("Version: " + version)

@app.route("/")
def index():
    return render_template("base.html", version=version)


@app.route("/uploadFile", methods=["POST"])
def upload_file():
    """
    Uploads a custom file from local computer.
    """
    f = request.files["file"]
    buffer_ = list()
    buffer_.append("Content-type: %s" % f.content_type)
    result_string = f.stream.read()
    buffer_.append("File content: %s" % f.stream.read())
    return result_string


@app.route("/saveFileToLocal", methods=["POST"])
def save():
    content = request.get_json(silent=True)
    temp_file = tempfile.TemporaryFile()

    try:
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
    path = request.data.decode().strip("/")
    path = os.path.join(TEMP_FILE_FOLDER, path)
    norm_path = os.path.join(os.path.normpath(path), filename)

    json_data = open(norm_path, "r+")
    data = json.load(json_data)
    response = app.response_class(
        response=json.dumps(data), status=200, mimetype="application/json"
    )
    return response


@app.route("/getGitHubRepositoryList", methods=["POST"])
def get_git_hub_repository_list():
    d = GITHUB_DEFAULT_REPO_LIST

    return jsonify(d)


@app.route("/getGitLabRepositoryList", methods=["POST"])
def get_git_lab_repository_list():
    d = GITLAB_DEFAULT_REPO_LIST

    return jsonify(d)


@app.route("/getTranslatorUrl", methods=["POST"])
def get_translator_url():
    return jsonify(DEFAULT_TRANSLATOR_URL)


def extract_folder_and_repo_names(repo_name):
    # If repository name has more than one slash, then after the second slash it is a folder name in that repository.
    # E.g. repo = <username or organisation name>/<reponame>/<folder>. The Github library considers repository name
    # as <..>/<reponame>
    #
    # Extract folder name and update repository name to the true one.
    folder_name = ""
    if repo_name.count("/") > 1:
        folder_name = repo_name.split("/", 2)[2]
        repo_name_true = repo_name.split("/" + folder_name, 1)[0]
        repo_name = repo_name_true
    return folder_name, repo_name


@app.route("/getGitHubFiles", methods=["POST"])
def get_git_hub_files():
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
    content = request.get_json(silent=True)

    try:
        repo_name = content["repository"]
        repo_branch = content["branch"]
        repo_token = content["token"]
        #print("repo_name:" + repo_name + " repo_branch:" + repo_branch + " repo_token:" + repo_token)
    except KeyError as ke:
        print("KeyError {1}: {0}".format(str(ke), repo_name))
        return "Repository or Token fields not specified in request", 400

    # Extracting the true repo name and repo folder.
    folder_name, repo_name = extract_folder_and_repo_names(repo_name)
    g = github.Github(repo_token)

    try:
        repo = g.get_repo(repo_name)
    except github.UnknownObjectException as uoe:
        print("UnknownObjectException {1}: {0}".format(str(uoe), repo_name))
        return jsonify({"": []})

    # get results
    d = parse_github_folder(repo, "", repo_branch)

    # response
    return jsonify(d)


@app.route("/getGitLabFilesAll", methods=["POST"])
def get_git_lab_files_all():
    content = request.get_json(silent=True)
    repo_name = content["repository"]
    repo_branch = content["branch"]
    repo_token = content["token"]
    #print("repo_name:" + repo_name + " repo_branch:" + repo_branch + " repo_token:" + repo_token)

    gl = gitlab.Gitlab('https://gitlab.com', private_token=repo_token, api_version=4)
    gl.auth()

    try:
        project = gl.projects.get(repo_name)

        #print("branches:" + str(project.branches.list()))

        items = project.repository_tree(recursive='true', all=True, ref=repo_branch)
    except gitlab.GitlabGetError as gge:
        print("GitlabGetError {1}: {0}".format(str(gge), repo_name))
        return jsonify({"": []})

    d = parse_gitlab_folder(items, "")

    return jsonify(d)

@app.route("/saveFileToRemoteGithub", methods=["POST"])
def save_git_hub_file():
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
    repo = g.get_repo(repo_name)

    # Set branch
    branch_ref = repo.get_git_ref("heads/" + repo_branch)
    branch_sha = branch_ref.object.sha

    # Add repo and file name in the graph.
    graph["modelData"]["repo"] = repo_name
    graph["modelData"]["filePath"] = filename
    # Clean the GitHub file reference.
    graph["modelData"]["sha"] = ""
    graph["modelData"]["git_url"] = ""
    # The 'indent=4' option is used for nice formatting. Without it the file is stored as a single line.
    json_data = json.dumps(graph, indent=4)

    # Commit to GitHub repo.
    latest_commit = repo.get_git_commit(branch_sha)
    base_tree = latest_commit.tree
    new_tree = repo.create_git_tree(
        [
            github.InputGitTreeElement(
                path=filename, mode="100644", type="blob", content=json_data
            )
        ],
        base_tree,
    )

    new_commit = repo.create_git_commit(
        message=commit_message, parents=[latest_commit], tree=new_tree
    )
    branch_ref.edit(sha=new_commit.sha, force=False)

    return "ok"

# TODO: update for gitlab
@app.route("/saveFileToRemoteGitlab", methods=["POST"])
def save_git_lab_file():
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
    graph["modelData"]["sha"] = ""
    graph["modelData"]["git_url"] = ""
    # The 'indent=4' option is used for nice formatting. Without it the file is stored as a single line.
    json_data = json.dumps(graph, indent=4)

    # see if file exists
    try:
        f = project.files.get(file_path=filename, ref=repo_branch)
        # update content
        f.content = json_data
        f.save(branch=repo_branch, commit_message=commit_message)
    except gitlab.GitlabGetError as gge:
        print("GitlabGetError {1}: {0}".format(str(gge), repo_name))
        # since file doesn't exist, we need to create a new file
        f = project.files.create({'file_path': filename,
                          'branch': repo_branch,
                          'content': json_data,
                          'commit_message': commit_message})

    return "ok"


@app.route("/openRemoteGithubFile", methods=["POST"])
def open_git_hub_file():
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
    repo = g.get_repo(repo_name)

    f = repo.get_contents(filename, ref=repo_branch)
    raw_data = f.decoded_content

    # special case for handling XML files (e.g. doxygen output)
    if extension == ".xml":
        response = app.response_class(
            response=raw_data, status=200, mimetype="application/xml"
        )
        return response

    # Add the GitHub file reference.
    graph = json.loads(raw_data)
    if not "modelData" in graph:
        graph["modelData"] = {}
    graph["modelData"]["sha"] = f.sha
    graph["modelData"]["git_url"] = f.git_url
    json_data = json.dumps(graph, indent=4)

    response = app.response_class(
        response=json.dumps(json_data), status=200, mimetype="application/json"
    )
    return response


@app.route("/openRemoteGitlabFile", methods=["POST"])
def open_git_lab_file():
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

    # get the data from gitlab
    gl = gitlab.Gitlab('https://gitlab.com', private_token=repo_token, api_version=4)
    gl.auth()

    project = gl.projects.get(repo_name)
    f = project.files.get(file_path=filename, ref=repo_branch)

    # get the decoded content
    raw_data = f.decode()

    # special case for handling XML files (e.g. doxygen output)
    if extension == ".xml":
        response = app.response_class(
            response=raw_data, status=200, mimetype="application/xml"
        )
        return response

    # Add the GitHub file reference.
    #graph = json.loads(raw_data)
    #graph["modelData"]["sha"] = f.sha
    #graph["modelData"]["git_url"] = f.git_url
    #json_data = json.dumps(graph, indent=4)

    response = app.response_class(
        response=json.dumps(raw_data), status=200, mimetype="application/json"
    )
    return response


def parse_github_folder(repo, path, branch):
    result = {"": []}

    # Getting repository file list
    try:
        contents = repo.get_contents(path, ref=branch)
    except github.GithubException:
        return result

    while contents:
        file_content = contents.pop(0)

        if file_content.type == "dir":
            result[file_content.path] = parse_github_folder(repo, file_content.path, branch)
        else:
            result[""].append(file_content.name)

    return result


def parse_gitlab_folder(items, path):
    result = {"": []}

    for item in items:
        #print(item)

        if item[u'type'] == u'tree':
            name = item[u'name']
            path = item[u'path']
            folders = path.split('/')
            #print("tree", name, path, folders)

            x = result
            for folder in folders:
                #print("Add", folder, "to", x)
                if folder not in x:
                    x[folder] = {"" : []};
                x = x[folder]

        if item[u'type'] == u'blob':
            name = item[u'name']
            path = item[u'path']
            folders = path.split('/')
            #print("blob", name, path, folders)

            x = result
            for folder in folders[:-1]:
                x = x[folder]
            x[""].append(item[u'name'])

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
            "Failed to save a pretranslated graph {0}:{1}".format(lg_name, str(exp))
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
    args = parse_args()

    # Initialise Physical Graph Manager - responsible for storing graph
    # templates.

    logging.basicConfig(level=logging.INFO, stream=sys.stdout)

    app.run(host="0.0.0.0", debug=True, port=args.port)


if __name__ == "__main__":
    main()
