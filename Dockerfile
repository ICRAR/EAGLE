# we are doing a two-stage build to keep the size of
# the final image low.

FROM tiangolo/meinheld-gunicorn-flask:python3.7-alpine3.8
COPY . .
RUN apk add --update npm bash git curl alpine-sdk linux-headers
RUN npm install -g typescript
RUN python updateVersion.py
RUN mv VERSION /tmp/.
RUN pip install .
RUN sphinx-apidoc -o docs/source eagleServer
RUN cd docs; make html
RUN pip list | grep -i sphinx | awk '{print $1}'|xargs pip uninstall -y
RUN pip uninstall -y pip
RUN mv prestart.sh /tmp/.
RUN cp -R static/docs /usr/local/lib/python3.7/site-packages/static
RUN npm uninstall -g typescript
RUN apk del git curl alpine-sdk linux-headers npm
RUN rm -rf * .[egv]*
RUN mv /tmp/* .

FROM tiangolo/meinheld-gunicorn-flask:python3.7-alpine3.8
COPY --from=0 /app/. .
COPY --from=0 /usr/local/lib/python3.7/site-packages/. /usr/local/lib/python3.7/site-packages/. 
RUN pip uninstall -y pip
