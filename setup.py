#
#    ICRAR - International Centre for Radio Astronomy Research
#    (c) UWA - The University of Western Australia, 2015
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
from distutils.command.build import build  # strange resolve error...
from subprocess import call

from setuptools import setup, find_packages
from setuptools.command.install import install

BASEPATH = os.path.dirname(os.path.abspath(__file__))

class npmBuild(build):
    def run(self):
        # run original build code
        build.run(self)

        # build docs
        build_path = os.path.abspath(self.build_temp)

        cmd = ["npm"]

        options = ["install", "--only=production"]
        cmd.extend(options)

        target_dir = os.path.join(BASEPATH, "static", "built")

        def compile():
             call(cmd)
             call(["tsc"])

        self.execute(compile, [], "Running npm")


        if not self.dry_run:
            self.copy_tree(target_dir, os.path.join(self.build_lib, "static", "built"))

version = '0.0'
# with open("VERSION") as vfile:
#     for line in vfile.readlines():
#         if "SW_VER" in line:
#             version = line.split("SW_VER ")[1].strip()[1:-1]
#             break

def package_files(directory):
    paths = []
    for (path, directories, filenames) in os.walk(directory):
        for filename in filenames:
            paths.append(os.path.join('..', path, filename))
    return paths

static_files = package_files('static')


install_requires = [
    "flask",
    "pygithub",
    "python-gitlab",
    "sphinx",
    "sphinx_rtd_theme",
    'sphinxcontrib.openapi',
    "six"
]

setup(
    name="eagleServer",
    version=version,
    description="The server for the DALiuGE EAGLE graph editor",
    long_description="This package contains the server for the EAGLE graph editor part of the DALIuGE system",
    classifiers=[],
    keywords="",
    author="",
    author_email="",
    url="",
    license="",
    packages=find_packages(),
#    include_package_data=True,
    package_data={
        "EAGLE": ["README", "*.txt"],
        "templates": ["*.html"],
        "static": static_files,
        # "docs": ["*"],
    },
    #    dependency_links=['http://github.com/ICRAR/daliuge/tarball/master#egg=daliuge-1.0'],
    install_requires=install_requires,
    # No spaces allowed between the '='s
    entry_points={"console_scripts": ["eagleServer=eagleServer.eagleServer:main"]},
    cmdclass={"build": npmBuild},
)
