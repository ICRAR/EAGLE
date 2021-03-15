# updateVersion
import os, sys

# gather git tag information
tag_stream = os.popen("git describe --tags --abbrev=0")
tag_output = tag_stream.read().rstrip("\n")
if len(sys.argv) == 2:
    tag_output += "-" + sys.argv[1]
print("tag_output: " + tag_output)

# gather git commit hash
hash_stream = os.popen("git rev-parse --verify HEAD")
hash_output = hash_stream.read().rstrip("\n")
print("hash_output: " + hash_output)

# create file contents
file_contents = "#define SW_VER \"" + tag_output + "\"\n" + "#define COMMIT_HASH \"" + hash_output + "\"\n"
#print(file_contents)

# write version information to file
version_file = open("static/VERSION", "w")
version_file.write(file_contents)
version_file.close()
