echo ""
echo ">>>>>"
echo "Gracefully restarting gunicorn workers"
echo "<<<<<"
echo ""
docker exec -ti eagle-dev kill -HUP 1

