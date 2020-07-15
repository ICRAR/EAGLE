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
import os

SERVER_PORT = 8888

# It's like the password to your computer.
# The secret plus the data-to-sign are used to create a signature string,
# a hard-to-recreate value using a cryptographic hashing algorithm;
# only if you have the exact same secret and the original data can you recreate this value,
# letting Flask detect if anything has been altered without permission.
# Since the secret is never included with data Flask sends to the client,
# a client cannot tamper with session data and hope to produce a new, valid signature.
WTF_CSRF_ENABLED = True

GITHUB_DEFAULT_REPO_LIST = [
    {"repository":"ICRAR/EAGLE_test_repo", "branch":"master"},
    {"repository":"ICRAR/EAGLE_graph_repo", "branch":"master"},
]

GITLAB_DEFAULT_REPO_LIST = [
]

# This is the default location of the graph translator service
DEFAULT_TRANSLATOR_URL = 'http://localhost/gen_pgt'

# This is the default, but needs to be changed if installed under a different user.
TEMP_FILE_FOLDER = '/home/eagle/EAGLE'
