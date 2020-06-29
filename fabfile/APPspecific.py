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
Main module where application-specific tasks are defined. The main procedure
is dependent on the fabfileTemplate module.
"""
import os, sys
from fabric.state import env
from fabric.colors import red, green
from fabric.operations import local
from fabric.decorators import task
from fabric.context_managers import settings

from fabfileTemplate.utils import home

if sys.version_info.major == 3:
    import urllib.request as urllib2
else:
    import urllib2

# The following variable will define the Application name as well as directory
# structure and a number of other application specific names.
APP = 'EAGLE'

# The username to use by default on remote hosts where APP is being installed
# This user might be different from the initial username used to connect to the
# remote host, in which case it will be created first
APP_USER = APP.lower()

# Name of the directory where APP sources will be expanded on the target host
# This is relative to the APP_USER home directory
APP_SRC_DIR_NAME = APP.lower() + '_src'

# Name of the directory where APP root directory will be created
# This is relative to the APP_USER home directory
APP_ROOT_DIR_NAME = APP.upper()

# Name of the directory where a virtualenv will be created to host the APP
# software installation, plus the installation of all its related software
# This is relative to the APP_USER home directory
APP_INSTALL_DIR_NAME = APP.lower() + '_rt'

# Sticking with Python3.6 because that is available on AWS instances.
APP_PYTHON_VERSION = '3.6'

# URL to download the correct Python version
APP_PYTHON_URL = 'https://www.python.org/ftp/python/3.6.9/Python-3.6.9.tgz'

# NOTE: Make sure to modify the following lists to meet the requirements for
# the application.
APP_DATAFILES = []

# AWS specific settings
env.AWS_REGION = 'us-east-1'
env.AWS_AMI_NAME = 'Amazon'
env.AWS_INSTANCES = 1
env.AWS_INSTANCE_TYPE = 't2.micro'
env.AWS_KEY_NAME = 'icrar_{0}'.format(APP_USER)
env.AWS_SEC_GROUP = 'NGAS' # Security group allows SSH and other ports
env.AWS_SUDO_USER = 'ec2-user' # required to install init scripts.

env.APP_NAME = APP
env.APP_USER = APP_USER
env.APP_INSTALL_DIR_NAME = APP_INSTALL_DIR_NAME
env.APP_ROOT_DIR_NAME = APP_ROOT_DIR_NAME
env.APP_SRC_DIR_NAME = APP_SRC_DIR_NAME
env.APP_PYTHON_VERSION = APP_PYTHON_VERSION
env.APP_PYTHON_URL = APP_PYTHON_URL
env.APP_DATAFILES = APP_DATAFILES
env.APP_repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# Alpha-sorted packages per package manager
env.pkgs = {
            'YUM_PACKAGES': [
                     'python36',
                     'python36-devel',
                     'readline-devel',
                     'openssl-devel',
                     'gcc',
                     'make',
                    #  'nginx',
                     'git',
                     'systemd-sysv',
                     ],
            'APT_PACKAGES': [
                    'python-dev',
                    'python-setuptools',
                    'tar',
                    'wget',
                    'gcc',
                    'nginx',
                    'git'
                    ],
            'SLES_PACKAGES': [
                    'python-devel',
                    'wget',
                    'zlib',
                    'zlib-devel',
                    'gcc',
                    ],
            'BREW_PACKAGES': [
                    'wget',
                    ],
            'PORT_PACKAGES': [
                    'wget',
                    ],
            'APP_EXTRA_PYTHON_PACKAGES': [
                    'pygithub',
                    'sphinx',
                    'uwsgi',
                    ],
        }

# This dictionary defines the visible exported tasks.
__all__ = [
    'sysinitstart_EAGLE_and_check_status',
    'sysinitstop_EAGLE',
]

# >>> The following lines need to be after the definitions above!!!

from fabfileTemplate.utils import sudo, info, success, default_if_empty
from fabfileTemplate.system import check_command
from fabfileTemplate.APPcommon import virtualenv, APP_doc_dependencies, APP_source_dir, APP_root_dir
from fabfileTemplate.APPcommon import extra_python_packages, APP_user, build, APP_install_dir

def APP_build_cmd():

    # The installation of the bsddb package (needed by ngamsCore) is in
    # particular difficult because it requires some flags to be passed on
    # (particularly if using MacOSX's port
    # >>>> NOTE: This function potentially needs heavy customisation <<<<<<
    build_cmd = []
    # linux_flavor = get_linux_flavor()

    env.APP_INSTALL_DIR = os.path.abspath(os.path.join(home(), APP_INSTALL_DIR_NAME))
    env.APP_ROOT_DIR = os.path.abspath(os.path.join(home(), APP_ROOT_DIR_NAME))
    env.APP_SRC_DIR = os.path.abspath(os.path.join(home(), APP_SRC_DIR_NAME))
    build_cmd.append('cd {0} ;'.format(APP_source_dir()))
    build_cmd.append('pip install . ;')

    return ' '.join(build_cmd)

def extra_sudo():
    """
    sudo npm install -g typescript
    """
    if env.FAB_TASK == 'docker_image':
        env.sudo_user = 'root'
    elif env.FAB_TASK == 'aws_deploy':
        env.sudo_user = env.AWS_SUDO_USER
    with settings(user=env.sudo_user):
        sudo('curl -sL https://rpm.nodesource.com/setup_10.x | sudo -E bash -')
        sudo('yum --assumeyes --quiet install nodejs')
        sudo('npm install -g typescript')

def install_sysv_init_script(nsd, nuser, cfgfile):
    """
    Install the uwsgi init script for an operational deployment of EAGLE.
    The init script is an old System V init system.
    In the presence of a systemd-enabled system we use the update-rc.d tool
    to enable the script as part of systemd (instead of the System V chkconfig
    tool which we use instead). The script is prepared to deal with both tools.
    """
    if env.FAB_TASK == 'docker_image':
        env.sudo_user = 'root'
    elif env.FAB_TASK == 'aws_deploy':
        env.sudo_user = env.AWS_SUDO_USER
    with settings(user=env.sudo_user):

        # Different distros place it in different directories
        # The init script is prepared for both
        opt_file = '/etc/uwsgi/uwsgi.ini'

        # The uwsgi binary got installed into the virtualenv. Lets pull that over
        # to the system wide folder.
        sudo('cp {0}/bin/uwsgi /usr/local/bin/uwsgi'.format(APP_install_dir()))
        sudo('chmod 755 /usr/local/bin/uwsgi')

        # init file installation
        sudo('cp {0}/fabfile/init/sysv/uwsgi /etc/init.d/'.format(APP_source_dir()))
        sudo('chmod 755 /etc/init.d/uwsgi')

        # Options file installation and edition
        sudo('mkdir -p /etc/uwsgi')
        sudo('cp {0}/fabfile/init/sysv/uwsgi.ini {1}'.format(APP_source_dir(),
                                                            opt_file))
        sudo('chmod 644 {0}'.format(opt_file))

        # Enabling init file on boot
        if check_command('update-rc.d'):
            sudo('update-rc.d uwsgi defaults')
        else:
            sudo('chkconfig --add uwsgi')

        # Nginx is not in standard repos
        # go get it [This is just for centos]
        sudo('cp {0}/fabfile/init/nginx.repo /etc/yum.repos.d/.'.
            format(APP_source_dir()))
        sudo('yum update ; yum install nginx')
        # Now let's connect that to nginx
        # Copy main nginx conf file
        sudo('cp {0}/fabfile/init/sysv/nginx.conf /etc/nginx/.'.
            format(APP_source_dir()))
        # copy uwsgi nginx conf file
        sudo('cp {0}/fabfile/init/sysv/eagle.conf /etc/nginx/conf.d/.'.
            format(APP_source_dir()))

    success("Init scripts installed")


@task
def sysinitstart_EAGLE_and_check_status():
    """
    Starts the APP daemon process and checks that the server is up and running
    then it shuts down the server
    """
    # We sleep 2 here as it was found on Mac deployment to docker container
    # that the shell would exit before the APPDaemon could detach, thus
    # resulting in no startup self.
    #
    # Please replace following line with something meaningful
    # virtualenv('ngamsDaemon start -cfg {0} && sleep 2'.format(tgt_cfg))
    info('Start {0} and check'.format(APP))
    if env.FAB_TASK == 'docker_image':
        env.sudo_user = 'root'
    elif env.FAB_TASK == 'aws_deploy':
        env.sudo_user = env.AWS_SUDO_USER
    with settings(user=env.sudo_user):
        sudo('service nginx start')
        sudo('service uwsgi start')
    try:
        u = urllib2.urlopen('http://{0}/static/html/index.html'.
                            format(env.host_string))
    except urllib2.URLError:
        red("EAGLE NOT running!")
        return
    r = u.read()
    u.close()
    if type(r) == bytes:   # required for Python3
        r = r.decode('UTF-8')
    if r.find('eagle-s-user-documentation') > -1:
        red("EAGLE NOT running")
    else:
        green("EAGLE running. Connect through: http://{0}/new".format(env.host_string))

@ task
def sysinitstop_EAGLE():
    """
    Stops the nginx and uwsgi services if running.
    NOTE: Requires sudo privilidges
    """
    info('Check and stop {0}'.format(APP))
    if env.FAB_TASK == 'docker_image':
        env.sudo_user = 'root'
    elif env.FAB_TASK == 'aws_deploy':
        env.sudo_user = env.AWS_SUDO_USER
    try:
        u = urllib2.urlopen('http://{0}/static/html/index.html'.
                            format(env.host_string))
    except urllib2.URLError:
        red("EAGLE NOT running!")
        return
    r = u.read()
    u.close()
    if type(r) == bytes:   # required for Python3
        r = r.decode('UTF-8')
    assert r.find('eagle-s-user-documentation') > -1, red("EAGLE NOT running")

    with settings(user=env.sudo_user):
        sudo('service nginx stop')
        sudo('service uwsgi stop')


def dummy():
    pass

env.build_cmd = APP_build_cmd
env.APP_init_install_function = install_sysv_init_script
env.sysinitAPP_start_check_function = sysinitstart_EAGLE_and_check_status
env.APP_extra_sudo_function = extra_sudo
