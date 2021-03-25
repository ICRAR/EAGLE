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
import six

import github
import gitlab
import pkg_resources
from flask import Flask, request, render_template, jsonify

import config.config
from config.config import TRANSLATOR_SERVER_PORT

from LogicalGraph import LogicalGraph
from Translator import Translator
from PartitioningAlgorithm import PartitioningAlgorithm


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



@app.route("/gen_pgt", methods=["POST"])
def translate_lg():
    """
    Uploads a custom file from local computer.
    """
    print("translate_lg()")

    #print("form" + str(request.form))
    algo = request.form.get("algo", "none")
    lg_name = request.form.get("lg_name", "")
    json_data = request.form.get("json_data", "")
    num_islands = request.form.get("num_islands", '0')
    ('num_par', '1'), ('par_label', 'Partition'), ('max_load_imb', '100'), ('max_cpu', '8'), ('num_parallel_task_streams', '1')

    # TODO: check JSON with validator

    # create LogicalGraph object from JSON
    lg = LogicalGraph()
    lg.loadJSON(json_data)

    # create Translator object
    translator = Translator()

    # set partitioning algorithm
    pa = PartitioningAlgorithm()
    translator.setPartitioningAlgorithm(pa)

    # translate
    pgt = translator.translate(lg)

    #pgt = {"Physical Graph Template": "Placeholder"}



    response = app.response_class(
        response=json.dumps(pgt), status=200, mimetype="application/json"
    )
    return response






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
        default=TRANSLATOR_SERVER_PORT,
        help="DALiuGE translator server port (%d by default)" % TRANSLATOR_SERVER_PORT,
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
