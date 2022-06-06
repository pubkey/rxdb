# retries running the tests 3 times
# we need this in the CI because starting electron randomly failed

# @link https://unix.stackexchange.com/a/82602
n=0
until [ "$n" -ge 3 ]
do
   npm run test && exit 0
   n=$((n+1)) 
   sleep 5
done

# all times failed, exit with error
exit 1
