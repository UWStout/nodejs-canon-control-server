camNum=58

devNum=4
for i in {1..3}; do
  printf -v camName "CAM%03d" $camNum
  printf -v devName "/dev/disk%d" $devNum
  diskutil eraseDisk FAT32 "${camName}" MBRFormat "${devName}"
  cp ./CCF17120.FIR "/Volumes/${camName}/"

  camNum=$((camNum+1))
  devNum=$((devNum+1))
done

diskutil unmountDisk /dev/disk6
diskutil unmountDisk /dev/disk5
diskutil unmountDisk /dev/disk4
