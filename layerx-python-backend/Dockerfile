FROM ubuntu:20.04

ENV DEBIAN_FRONTEND noninteractive

# install dependancies
RUN apt-get update -y && \
    apt-get install -y build-essential cmake unzip pkg-config && \
    apt-get install -y libjpeg-dev libpng-dev libtiff-dev && \
    apt-get install -y libavcodec-dev libavformat-dev libswscale-dev libv4l-dev && \
    apt-get install -y libxvidcore-dev libx264-dev && \
    apt-get install -y libgtk-3-dev && \
    apt-get install -y openexr python3-numpy libtbb2 libtbb-dev libdc1394-22-dev && \
    apt-get install -y libatlas-base-dev gfortran && \
    apt-get install -y python3-pip python3-dev && \
    apt install -y git-all 
    # apt-get install -y python3-opencv
    # pip install virtualenv virtualenvwrapper

# RUN echo -e "\n# virtualenv and virtualenvwrapper" >> ~/.bashrc  && \
#     echo "export WORKON_HOME=$HOME/.virtualenvs" >> ~/.bashrc && \
#     echo "export VIRTUALENVWRAPPER_PYTHON=/usr/bin/python3" >> ~/.bashrc && \
#     echo "source /usr/local/bin/virtualenvwrapper.sh" >> ~/.bashrc && \
#     source ~/.bashrc

# RUN apt-get update && apt-get install -y python3-opencv
# RUN apt install -y libopencv-dev python3-opencv
# RUN pip3 install opencv-python

# We copy just the requirements.txt first to leverage Docker cache
COPY ./requirements.txt /app/requirements.txt

WORKDIR /app

RUN pip3 install --upgrade -r requirements.txt

# Build openCv
RUN git clone https://github.com/opencv/opencv.git && \
    git clone https://github.com/opencv/opencv_contrib.git
RUN cd opencv && \
    mkdir build && \ 
    cd build && \
    cmake -D CMAKE_BUILD_TYPE=RELEASE \
    -D CMAKE_INSTALL_PREFIX=/usr/local \
    -D WITH_TBB=OFF \
    -D WITH_IPP=OFF \
    -D WITH_1394=OFF \
    -D BUILD_WITH_DEBUG_INFO=OFF \
    -D BUILD_DOCS=OFF \
    -D INSTALL_C_EXAMPLES=ON \
    -D INSTALL_PYTHON_EXAMPLES=ON \
    -D ENABLE_FAST_MATH=1 \
    -D OPENCV_DNN_CUDA=OFF \
    -D BUILD_EXAMPLES=OFF \
    -D BUILD_TESTS=OFF \
    -D BUILD_PERF_TESTS=OFF \
    -D WITH_QT=ON \
    -D OPENCV_ENABLE_NONFREE=ON \
    -D OPENCV_EXTRA_MODULES_PATH=../../opencv_contrib/modules \
    -D PYTHON3_EXECUTABLE=$(which python3) \
    -D WITH_FFMPEG=ON \
    -D BUILD_NEW_PYTHON_SUPPORT=ON \
    -D OPENCV_GENERATE_PKGCONFIG=ON .. && \
    make -j4 && \
    make install 

# due to a problem in installation cv2 is not saved in dist-packages
RUN python3 -c "import cv2; print(cv2.__version__); print(cv2.__path__)"
RUN cp -r /usr/local/lib/python3.8/site-packages/cv2 /usr/local/lib/python3.8/dist-packages/
RUN python3 -c "import cv2; print(cv2.__version__); print(cv2.__path__)"

# link opencv to venv
# ????

# install gunicorn
# RUN pip install gunicorn

COPY . /app/
COPY model_data /app/model_data

ENTRYPOINT [ "python3" ]

CMD ["app.py"]

# CMD [ "gunicorn", "--bind", "0.0.0.0:8081", "wsgi:app", "-w", "2", "--threads", "1", "--timeout", "360" ]